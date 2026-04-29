import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prompt, platforms, tone, action, message } = await req.json();
  if (action === "enhance" && !message?.trim() && !prompt?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (action !== "enhance" && !prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const azureKey = process.env.AZURE_OPENAI_API_KEY;
  const azureUrl = process.env.AZURE_OPENAI_URL;
  
  if (!azureKey || !azureUrl) {
    return NextResponse.json({ error: "Azure OpenAI is not configured" }, { status: 500 });
  }

  const targetPlatforms = platforms || ["FACEBOOK", "TWITTER", "INSTAGRAM", "LINKEDIN"];

  try {
    const { AzureOpenAI } = await import("openai");
    
    const url = new URL(azureUrl);
    const endpoint = `${url.protocol}//${url.host}`;
    const deployment = url.pathname.split("/deployments/")[1]?.split("/")[0] || "gpt-4";
    const apiVersion = url.searchParams.get("api-version") || "2025-01-01-preview";

    const client = new AzureOpenAI({ 
      apiKey: azureKey,
      endpoint,
      deployment,
      apiVersion,
    });

    if (action === "enhance") {
      const response = await client.chat.completions.create({
        model: deployment,
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
      model: deployment,
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
