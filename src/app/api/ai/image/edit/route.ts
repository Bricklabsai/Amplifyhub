import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAzureImageAPIConfig } from "@/lib/azure-openai";

// Helper to convert File object to Base64 string for Azure
async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  try {
    const formData = await req.formData();
    const prompt = formData.get("prompt") as string;
    const imageFile = formData.get("image") as File;
    const maskFile = formData.get("mask") as File | null;
    const size = (formData.get("size") || "1024x1024");

    const config = getAzureImageAPIConfig();
    
    // 1. Use the EXACT API version from your curl command
    const apiVersion = "2024-02-01"; 
    const url = `${config.resourceUrl}/openai/deployments/gpt-image-2/images/edits?api-version=${apiVersion}`;

    // 2. Build the FormData payload
    const editsFormData = new FormData();
    editsFormData.append("prompt", prompt);
    editsFormData.append("image", imageFile);
    editsFormData.append("size", size);
    if (maskFile) {
      editsFormData.append("mask", maskFile);
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
      },
      body: editsFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Azure Error Response:", errorText);
      throw new Error(`Azure API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // 4. Extract base64 (matching your jq logic)
    const base64Image = data.data?.[0]?.b64_json;

    if (!base64Image) {
      throw new Error("No image data returned.");
    }

    const imageDataUrl = `data:image/png;base64,${base64Image}`;

    // Store in Prisma
    const savedMedia = await prisma.media.create({
      data: {
        userId,
        url: imageDataUrl,
        type: "image",
        filename: `ai-edit-${Date.now()}.png`,
        prompt,
        isAI: true,
      },
    });

    return NextResponse.json({ url: imageDataUrl, id: savedMedia.id });

  } catch (err: any) {
    console.error("Final Edit Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}