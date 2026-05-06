import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAzureOpenAIClient } from "@/lib/azure-openai";
import { checkAndIncrementUsage } from "@/lib/usage";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { prompt, platforms, tone, action, message } = await req.json();

  // Check usage limits
  const usage = await checkAndIncrementUsage(userId, "aiText");
  if (!usage.allowed) {
    return NextResponse.json({ 
      error: "AI text generation limit reached. Please upgrade your plan.",
      limit: usage.limit,
      current: usage.current,
      upgradeRequired: true
    }, { status: 403 });
  }
  if (action === "enhance" && !message?.trim() && !prompt?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (action !== "enhance" && !prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const targetPlatforms = platforms || ["FACEBOOK", "TWITTER", "INSTAGRAM", "LINKEDIN"];

  try {
    const client = getAzureOpenAIClient();

    if (action === "enhance") {
      const response = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a messaging assistant. Rewrite user content based on requested tone and provide 3 concise alternative suggestions.",
          },
          {
            role: "user",
            content: `Tone: ${tone || "professional"}\nOriginal message: ${message || prompt}\nReturn JSON with keys: improvedMessage (string), suggestions (string[]).`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
      });
      const parsed = JSON.parse(response.choices[0].message.content || "{}");
      return NextResponse.json({
        improvedMessage: parsed.improvedMessage || "",
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: `You are a social media expert. Generate a single engaging post suitable for all major platforms (Facebook, X/Twitter, LinkedIn, Instagram, etc.). Tone: ${tone || "professional"}. Keep it concise enough for all platforms.` 
        },
        { 
          role: "user", 
          content: `Create a post about: ${prompt}` 
        },
      ],
      max_tokens: 500,
    });
    
    const content = response.choices[0].message.content || "";
    return NextResponse.json({ content });
  } catch (err: any) {
    console.error("OpenAI error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate content" }, { status: 500 });
  }
}
