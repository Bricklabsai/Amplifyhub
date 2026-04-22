import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import { randomUUID } from "crypto";

type EngagementComment = {
  id: string;
  author: string;
  message: string;
  sentiment?: "positive" | "negative" | "neutral";
  replies: { id: string; message: string; createdAt: string }[];
  createdAt: string;
};

type PostEngagement = {
  postId: string;
  likes: number;
  comments: EngagementComment[];
};

const FILE_NAME = "post-engagement.json";

async function analyzeSentiment(messages: string[]) {
  // const openaiKey = process.env.OPENAI_API_KEY;
  // if (!openaiKey || messages.length === 0) return [] as ("positive" | "negative" | "neutral")[];
  
  const subsplitKey = process.env.OPENAI_API_KEY;
  if (!subsplitKey || messages.length === 0) return [] as ("positive" | "negative" | "neutral")[];

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ 
      apiKey: subsplitKey,
      baseURL: "https://api.subsplit.ai/v1"
    });
    const response = await client.chat.completions.create({
      model: "gpt-5-chat",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Classify sentiment per comment. Return JSON: { sentiments: ['positive'|'negative'|'neutral'] }" },
        { role: "user", content: JSON.stringify(messages) },
      ],
      max_tokens: 300,
    });
    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    return Array.isArray(parsed.sentiments) ? parsed.sentiments : [];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { id } = await params;
  const post = await prisma.post.findFirst({ where: { id, userId, status: "PUBLISHED" } });
  if (!post) return NextResponse.json({ error: "Published post not found" }, { status: 404 });

  const store = await readJsonStore<PostEngagement[]>(FILE_NAME, []);
  const existing =
    store.find((x) => x.postId === id) ||
    {
      postId: id,
      likes: 12,
      comments: [
        {
          id: randomUUID(),
          author: "Customer A",
          message: "Great update, this really helped our workflow.",
          sentiment: "positive",
          replies: [],
          createdAt: new Date().toISOString(),
        },
        {
          id: randomUUID(),
          author: "Customer B",
          message: "I like it but the onboarding was a bit confusing.",
          sentiment: "neutral",
          replies: [],
          createdAt: new Date().toISOString(),
        },
      ],
    };
  return NextResponse.json(existing);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { id } = await params;
  const post = await prisma.post.findFirst({ where: { id, userId, status: "PUBLISHED" } });
  if (!post) return NextResponse.json({ error: "Published post not found" }, { status: 404 });

  const body = await req.json();
  const { action, commentId, message } = body as { action: "reply" | "analyze"; commentId?: string; message?: string };
  const store = await readJsonStore<PostEngagement[]>(FILE_NAME, []);
  const idx = store.findIndex((x) => x.postId === id);
  const current: PostEngagement = idx >= 0 ? store[idx] : { postId: id, likes: 12, comments: [] };

  if (action === "reply") {
    if (!commentId || !message?.trim()) return NextResponse.json({ error: "commentId and message required" }, { status: 400 });
    const cIdx = current.comments.findIndex((c) => c.id === commentId);
    if (cIdx < 0) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    current.comments[cIdx].replies.push({ id: randomUUID(), message: message.trim(), createdAt: new Date().toISOString() });
  }

  if (action === "analyze") {
    const sentiments = await analyzeSentiment(current.comments.map((c) => c.message));
    current.comments = current.comments.map((comment, i) => ({ ...comment, sentiment: sentiments[i] || comment.sentiment || "neutral" }));
  }

  if (idx >= 0) store[idx] = current;
  else store.unshift(current);
  await writeJsonStore(FILE_NAME, store);
  return NextResponse.json(current);
}
