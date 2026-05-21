import { getAzureOpenAIClient } from "@/lib/azure-openai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { emailText } = await request.json();

    if (!emailText) {
      return NextResponse.json(
        { error: "Email text is required" },
        { status: 400 }
      );
    }

    const client = getAzureOpenAIClient();

    const systemPrompt = `
You are an expert email copywriter.

Analyze the provided email and suggest 3-5 specific improvements.

For each improvement provide:
- suggestion
- original
- improved

IMPORTANT:
Return ONLY valid JSON.
Do not use markdown.
Do not wrap in \`\`\`json.
Return an array only.

Example:
[
  {
    "suggestion": "Improve clarity",
    "original": "Hi there",
    "improved": "Hello John"
  }
]
`;

    const response = await client.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Please improve this email:\n\n${emailText}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Clean markdown fences if model still returns them
    const cleanedContent = content
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    let improvements;

    try {
      improvements = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("JSON Parse Error:", cleanedContent);

      return NextResponse.json(
        {
          error: "Invalid AI JSON response",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      improvements,
    });

  } catch (error) {
    console.error("Email enhancement error:", error);

    return NextResponse.json(
      { error: "Failed to enhance email" },
      { status: 500 }
    );
  }
}