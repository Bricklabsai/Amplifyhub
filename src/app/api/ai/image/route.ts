import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { prompt, style } = await req.json();
  if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });

  const openaiKey = process.env.OPENAI_API_KEY;

  if (openaiKey && openaiKey.length > 10) {
    try {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: openaiKey });
      const response = await client.images.generate({
        model: "dall-e-3",
        prompt: `${prompt}${style ? `, ${style} style` : ""}`,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      });
      const url = response.data[0].url || "";
      await prisma.media.create({ data: { userId, url, type: "image", filename: `ai-${Date.now()}.png`, prompt, isAI: true } });
      return NextResponse.json({ url });
    } catch (err) {
      console.error("DALL-E error:", err);
    }
  }

  // Mock: Unsplash
  const keywords = prompt.split(" ").slice(0, 3).join(",");
  const mockUrl = `https://source.unsplash.com/1024x1024/?${encodeURIComponent(keywords)}`;
  await prisma.media.create({ data: { userId, url: mockUrl, type: "image", filename: `mock-${Date.now()}.jpg`, prompt, isAI: true } });
  return NextResponse.json({ url: mockUrl, mock: true });
}
