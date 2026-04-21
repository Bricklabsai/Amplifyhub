import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prompt, platforms, tone } = await req.json();
  if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: "OpenAI API Key is not configured" }, { status: 500 });
  }

  const targetPlatforms = platforms || ["FACEBOOK", "TWITTER", "INSTAGRAM", "LINKEDIN"];

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: openaiKey });

    const variations: Record<string, string> = {};
    for (const platform of targetPlatforms) {
      const platformGuide: Record<string, string> = {
        FACEBOOK: "engaging, conversational, 150-250 words with emojis and hashtags",
        TWITTER: "punchy, under 280 chars with 1-2 hashtags",
        INSTAGRAM: "visual, aspirational, 100-150 words with emojis and 5-10 hashtags",
        LINKEDIN: "professional, insightful, 200-300 words, no excessive emojis",
        TIKTOK: "trendy, casual, short hooks, use popular hashtags like #fyp",
        YOUTUBE: "detailed description with SEO keywords, 150-200 words",
        WHATSAPP: "friendly, personal, conversational, under 100 words",
      };
      
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: `You are a social media expert. Generate ${platformGuide[platform] || "engaging"} content. Tone: ${tone || "professional"}.` 
          },
          { 
            role: "user", 
            content: `Create a ${platform} post about: ${prompt}` 
          },
        ],
        max_tokens: 400,
      });
      variations[platform] = response.choices[0].message.content || "";
    }
    return NextResponse.json({ variations });
  } catch (err: any) {
    console.error("OpenAI error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate content" }, { status: 500 });
  }
}
