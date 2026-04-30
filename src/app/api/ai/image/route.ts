import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { prompt, style, template } = await req.json();
  if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });

  const fullPrompt = `${prompt}${style ? `, ${style} style` : ""}${template ? `, template: ${template}` : ""}`;
  const nanoApiKey = process.env.NANO_API_KEY;
  
  if (!nanoApiKey) {
    return NextResponse.json(
      { error: "Nano API key is not configured. Add NANO_API_KEY to your environment." },
      { status: 500 }
    );
  }

  try {
    // Initialize Google GenAI with API key
    const ai = new GoogleGenAI({
      apiKey: nanoApiKey,
    });

    // Generate image using Gemini Flash image generation model
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: fullPrompt,
    });

    if (!response.candidates || response.candidates.length === 0) {
      return NextResponse.json(
        { error: "No image generated. Please try again." },
        { status: 502 }
      );
    }

    let imageUrl = "";
    let imageData = "";

    // Extract image data from response
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageData = part.inlineData.data;
        // Convert base64 image to data URL
        imageUrl = `data:image/png;base64,${imageData}`;
        break;
      }
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image data found in response." },
        { status: 502 }
      );
    }

    // Store the generated image in media library
    await prisma.media.create({
      data: {
        userId,
        url: imageUrl,
        type: "image",
        filename: `gemini-ai-${Date.now()}.png`,
        prompt: fullPrompt,
        isAI: true,
      },
    });

    return NextResponse.json({ url: imageUrl });
  } catch (err: any) {
    console.error("Gemini image generation error:", err);
    const message = err?.message || "Failed to generate image with Gemini.";
    
    if (typeof message === "string" && message.toLowerCase().includes("invalid api key")) {
      return NextResponse.json(
        { error: "API key is invalid. Please check your NANO_API_KEY configuration." },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
