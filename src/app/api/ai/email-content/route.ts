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

    const { prompt, emailType, tone } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const client = getAzureOpenAIClient();

    const systemPrompt = `You are an expert email copywriter. Generate professional, engaging email content.
Email Type: ${emailType || "General"}
Tone: ${tone || "Professional"}

Include:
- Subject line
- Preview text (50 chars max)
- Body content (2-3 paragraphs)
- Call-to-action button text

Format as JSON with keys: subject, preview, body, ctaText, ctaUrl`;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse JSON response
    const emailContent = JSON.parse(content);

    return NextResponse.json({
      subject: emailContent.subject,
      preview: emailContent.preview,
      body: emailContent.body,
      ctaText: emailContent.ctaText || "Learn More",
      ctaUrl: emailContent.ctaUrl || "#",
    });
  } catch (error) {
    console.error("AI email generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate email content" },
      { status: 500 }
    );
  }
}
