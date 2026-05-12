import { getAzureOpenAIClient } from "@/lib/azure-openai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { emailText } = await request.json();

    if (!emailText) {
      return NextResponse.json({ error: "Email text is required" }, { status: 400 });
    }

    const client = getAzureOpenAIClient();

    const systemPrompt = `You are an expert email copywriter. Analyze the provided email and suggest 3-5 specific improvements.

For each improvement, provide:
1. What to improve (clarity, tone, engagement, CTA, etc.)
2. Original phrase
3. Improved phrase

Return as JSON array with objects: { suggestion: string, original: string, improved: string }`;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
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
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const improvements = JSON.parse(content);

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
