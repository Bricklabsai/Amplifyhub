import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAzureImageAPIConfig } from "@/lib/azure-openai";
import { checkAndIncrementUsage } from "@/lib/usage";

// gpt-image-2 supports flexible sizes, but we'll stick to your defined ones
type ImageQuality = "low" | "medium" | "high";
type ImageSize = "1024x1024" | "1024x1536" | "1536x1024";

const VALID_SIZES: ImageSize[] = ["1024x1024", "1024x1536", "1536x1024"];
const VALID_QUALITIES: ImageQuality[] = ["low", "medium", "high"];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  // Check usage limits
  const usage = await checkAndIncrementUsage(userId, "aiImage");
  if (!usage.allowed) {
    return NextResponse.json({ 
      error: "AI image generation limit reached. Please upgrade your plan.",
      limit: usage.limit,
      current: usage.current,
      upgradeRequired: true
    }, { status: 403 });
  }

  const { prompt, style, template, quality = "medium", size = "1024x1024" } = await req.json();
  
  if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  if (!VALID_QUALITIES.includes(quality)) {
    return NextResponse.json({ error: "Invalid quality" }, { status: 400 });
  }
  if (!VALID_SIZES.includes(size)) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 });
  }

  const basePrompt = `${prompt}${template ? `, template: ${template}` : ""}`;
  
  // Define 4 different styles for diversity
  const styleVariations = [
    "photorealistic, professional photography",
    "digital art, vibrant colors",
    "illustration, artistic style",
    style || "modern, minimalist design"
  ];

  try {
    const config = getAzureImageAPIConfig();
    
    // GPT-Image series often requires a more recent api-version (e.g., 2024-05-01-preview or later)
    const generationsUrl = `${config.resourceUrl}/openai/deployments/${config.imageDeployment}/images/generations?api-version=${config.apiVersion}`;

    // Generate 4 images with different styles
    const imagePromises = styleVariations.map(styleVariation => {
      const fullPrompt = `${basePrompt}, ${styleVariation} style`;
      
      return fetch(generationsUrl, {
        method: "POST",
        headers: {
          "api-key": config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          size,
          quality,
          n: 1,
          output_format: "png", 
        }),
      }).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.text();
          console.error("Azure GPT-Image error:", errorData);
          throw new Error(`Azure API error: ${response.status}`);
        }
        return response.json();
      }).then(data => ({
        base64: data.data?.[0]?.b64_json,
        style: styleVariation
      }));
    });

    const results = await Promise.all(imagePromises);
    const images = results.map(result => ({
      url: `data:image/png;base64,${result.base64}`,
      base64: result.base64,
      style: result.style
    })).filter(img => img.base64);

    if (images.length === 0) {
      return NextResponse.json(
        { error: "No image data returned from Azure." },
        { status: 502 }
      );
    }

    // Store all generated images in Prisma
    const savedMedias = await Promise.all(
      images.map(img => 
        prisma.media.create({
          data: {
            userId,
            url: img.url, 
            type: "image",
            filename: `ai-gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`,
            prompt: `${basePrompt}, ${img.style}`,
            isAI: true,
          },
        })
      )
    );

    return NextResponse.json({ 
      urls: images.map(img => img.url),
      images: images.map((img, i) => ({
        url: img.url,
        base64: img.base64,
        id: savedMedias[i].id,
        style: img.style
      })),
      primaryUrl: images[0].url,
      primaryId: savedMedias[0].id
    });

  } catch (err: any) {
    console.error("Internal Server Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate image." },
      { status: 500 }
    );
  }
}