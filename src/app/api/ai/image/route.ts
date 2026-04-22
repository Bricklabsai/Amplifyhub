import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizeAzureImageUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const pathname = parsed.pathname.replace(/\/+$/, "");
    if (pathname.endsWith("/images/generations")) return parsed.toString();
    if (pathname.endsWith("/chat/completions")) {
      parsed.pathname = pathname.replace(/\/chat\/completions$/, "/images/generations");
      return parsed.toString();
    }
    if (pathname.endsWith("/models/chat/completions")) {
      parsed.pathname = pathname.replace(/\/models\/chat\/completions$/, "/images/generations");
      return parsed.toString();
    }
    if (pathname.endsWith("/models/images/generations")) {
      parsed.pathname = pathname.replace(/\/models\/images\/generations$/, "/images/generations");
      return parsed.toString();
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { prompt, style, template } = await req.json();
  if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });

  const fullPrompt = `${prompt}${style ? `, ${style} style` : ""}${template ? `, template: ${template}` : ""}`;
  const grokKey = process.env.GROK_OPENAI_API_KEY || process.env.XAI_API_KEY;
  const grokApiUrl = process.env.GROK_OPENAI_URL?.trim().replace(/\.$/, "");
  const grokBaseUrl = process.env.GROK_OPENAI_BASE_URL?.trim().replace(/\/$/, "") || "https://api.x.ai/v1";
  const grokImageModel = process.env.GROK_IMAGE_MODEL || "grok-2-image";
  if (!grokKey || grokKey.length <= 10) {
    return NextResponse.json(
      { error: "Grok image generation is not configured. Add GROK_OPENAI_API_KEY (or XAI_API_KEY)." },
      { status: 500 }
    );
  }

  try {
    let url = "";

    // Azure-hosted model endpoint mode (full URL in GROK_OPENAI_URL)
    if (grokApiUrl) {
      const normalizedAzureUrl = normalizeAzureImageUrl(grokApiUrl);
      const azureResponse = await fetch(normalizedAzureUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": grokKey,
        },
        body: JSON.stringify({
          model: grokImageModel,
          prompt: fullPrompt,
          n: 1,
        }),
      });
      const azurePayload = await azureResponse.json();
      if (!azureResponse.ok) {
        if (azureResponse.status === 404) {
          return NextResponse.json(
            {
              error:
                "Azure endpoint returned 404. Check GROK_OPENAI_URL path. For image generation, use /images/generations (not /models/images/generations or /chat/completions).",
            },
            { status: 404 }
          );
        }
        const azureError =
          azurePayload?.error?.message ||
          azurePayload?.error ||
          `Azure Grok request failed with status ${azureResponse.status}`;
        return NextResponse.json({ error: azureError }, { status: azureResponse.status });
      }

      url =
        azurePayload?.data?.[0]?.url ||
        azurePayload?.output?.[0]?.url ||
        azurePayload?.result?.data?.[0]?.url ||
        "";

      if (!url && azurePayload?.data?.[0]?.b64_json) {
        url = `data:image/png;base64,${azurePayload.data[0].b64_json}`;
      }
    } else {
      // x.ai OpenAI-compatible mode (base URL in GROK_OPENAI_BASE_URL)
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: grokKey, baseURL: grokBaseUrl });
      const response = await client.images.generate({
        model: grokImageModel,
        prompt: fullPrompt,
        n: 1,
      });
      url = response.data?.[0]?.url || "";
    }

    if (!url) {
      return NextResponse.json({ error: "Grok did not return an image URL." }, { status: 502 });
    }
    await prisma.media.create({
      data: {
        userId,
        url,
        type: "image",
        filename: `grok-ai-${Date.now()}.png`,
        prompt: fullPrompt,
        isAI: true,
      },
    });
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error("Grok image generation error:", err);
    const message = err?.message || "Failed to generate image with Grok.";
    if (typeof message === "string" && message.toLowerCase().includes("incorrect api key")) {
      return NextResponse.json(
        {
          error:
            "Grok API key is invalid for the configured endpoint. If you use Azure-hosted Grok, set GROK_OPENAI_URL and the matching Azure api-key.",
        },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
