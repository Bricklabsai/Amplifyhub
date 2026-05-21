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

    const { emailType, purpose, brandColor } = await request.json();

    if (!emailType || !purpose) {
      return NextResponse.json(
        { error: "Email type and purpose are required" },
        { status: 400 }
      );
    }

    const client = getAzureOpenAIClient();

    const systemPrompt = `You are an expert HTML email designer. Generate a complete, responsive HTML email template.
Email Type: ${emailType}
Purpose: ${purpose}
Brand Color: ${brandColor || "#7c3aed"}

Requirements:
- Must be responsive (mobile + desktop)
- Include header section
- Include content area (${emailType === "NEWSLETTER" ? "3 sections" : "main message"})
- Include footer with unsubscribe
- Use inline CSS only
- Use placeholder text for content
- Professional design

Return ONLY valid HTML, no markdown or extra text.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Generate a ${emailType} email template for: ${purpose}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    let htmlContent = response.choices[0]?.message?.content;
    if (!htmlContent) {
      throw new Error("No response from AI");
    }

    htmlContent = htmlContent
      .replace(/```\s*html\s*/gi, "")
      .replace(/```/g, "")
      .trim();

    return NextResponse.json({
      htmlContent,
    });
  } catch (error) {
    console.error("AI template generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate email template" },
      { status: 500 }
    );
  }
}
