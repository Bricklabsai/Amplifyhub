import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  appendFileToMultipartForm,
  getAzureImageAPIConfig,
} from "@/lib/azure-openai";
import { checkAndIncrementUsage } from "@/lib/usage";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const usage = await checkAndIncrementUsage(userId, "aiImage");
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: "AI image limit reached. Please upgrade your plan.",
        limit: usage.limit,
        current: usage.current,
        upgradeRequired: true,
      },
      { status: 403 }
    );
  }

  try {
    const formData = await req.formData();
    const prompt = (formData.get("prompt") as string | null)?.trim();
    const imageFile = formData.get("image") as File | null;
    const maskFile = formData.get("mask") as File | null;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    if (!imageFile || imageFile.size === 0) {
      return NextResponse.json(
        { error: "Image file is required for editing" },
        { status: 400 }
      );
    }

    const config = getAzureImageAPIConfig();
    const url = `${config.resourceUrl}/openai/deployments/${config.imageDeployment}/images/edits?api-version=${config.apiVersion}`;

    const editsFormData = new FormData();
    editsFormData.append("prompt", prompt);
    await appendFileToMultipartForm(editsFormData, "image", imageFile);
    if (maskFile && maskFile.size > 0) {
      await appendFileToMultipartForm(editsFormData, "mask", maskFile);
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "api-key": config.apiKey,
      },
      body: editsFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ai/image/edit] Azure error:", response.status, errorText);
      let message = `Azure image edit failed (${response.status})`;
      try {
        const parsed = JSON.parse(errorText) as {
          error?: { message?: string };
          message?: string;
        };
        message =
          parsed.error?.message || parsed.message || errorText || message;
      } catch {
        if (errorText) message = errorText.slice(0, 500);
      }
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const data = (await response.json()) as {
      data?: { b64_json?: string }[];
    };
    const base64Image = data.data?.[0]?.b64_json;

    if (!base64Image) {
      return NextResponse.json(
        { error: "No image data returned from Azure." },
        { status: 502 }
      );
    }

    const imageDataUrl = `data:image/png;base64,${base64Image}`;

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
  } catch (err) {
    console.error("[ai/image/edit]", err);
    const message =
      err instanceof Error ? err.message : "Failed to edit image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
