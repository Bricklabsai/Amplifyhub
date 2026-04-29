import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";



export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { prompt, style, template } = await req.json();
  if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });

  const fullPrompt = `${prompt}${style ? `, ${style} style` : ""}${template ? `, template: ${template}` : ""}`;
  const grokKey = process.env.GROK_OPENAI_API_KEY;
  const grokApiUrl = process.env.GROK_OPENAI_URL;
  if (!grokKey || grokKey.length <= 10) {
    return NextResponse.json(
      { error: "Grok image generation is not configured. Add GROK_OPENAI_API_KEY." },
      { status: 500 }
    );
  }
  if (!grokApiUrl) {
    return NextResponse.json(
      { error: "GROK_OPENAI_URL is not configured." },
      { status: 500 }
    );
  }

  try {
    let url = "";

    const azureResponse = await fetch(grokApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": grokKey,
      },
      body: JSON.stringify({
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
              "Invalid Azure endpoint. Ensure /images/generations is used and deployment name is correct.",
          },
          { status: 404 }
        );
      }
      const azureError =
        azurePayload?.error?.message ||
        azurePayload?.error ||
        `Azure request failed with status ${azureResponse.status}`;
      return NextResponse.json({ error: azureError }, { status: azureResponse.status });
    }

    url =
      azurePayload?.data?.[0]?.url ||
      azurePayload?.data?.[0]?.b64_json ||
      "";

    if (!url && azurePayload?.data?.[0]?.b64_json) {
      url = `data:image/png;base64,${azurePayload.data[0].b64_json}`;
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
