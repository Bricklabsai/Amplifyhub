import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import { randomUUID } from "crypto";
import { fetchPlatformPostEngagement, fetchPlatformPostComments } from "@/lib/social";
import { replyViaZernio } from "@/lib/zernio-engagement";
import { notifyPostEngagement } from "@/lib/notifications";

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
  const post = await prisma.post.findFirst({
    where: { id, userId, status: "PUBLISHED" },
    include: {
      platformPosts: {
        include: {
          socialAccount: true,
        },
      },
    },
  });
  if (!post) return NextResponse.json({ error: "Published post not found" }, { status: 404 });

  const prevTotalLikes = post.platformPosts.reduce((s, pp) => s + (pp.likes ?? 0), 0);
  const prevTotalComments = post.platformPosts.reduce((s, pp) => s + (pp.comments ?? 0), 0);

  const store = await readJsonStore<PostEngagement[]>(FILE_NAME, []);
  const existing = store.find((x) => x.postId === id);

  // Fetch live engagement from each platform post in parallel. Per-account
  // failures are isolated so one platform's outage can't black out the rest.
  const perPostResults = await Promise.all(
    post.platformPosts
      .filter((pp) => Boolean(pp.externalId))
      .map(async (pp) => {
        try {
          const [engagement, comments] = await Promise.all([
            fetchPlatformPostEngagement(pp.socialAccountId, pp.externalId),
            fetchPlatformPostComments(pp.socialAccountId, pp.externalId),
          ]);

          // Persist the latest counts so the dashboard list reflects them
          // without forcing a refetch.
          await prisma.platformPost.update({
            where: { id: pp.id },
            data: {
              likes: engagement?.likes ?? pp.likes,
              comments: engagement?.comments ?? pp.comments,
            },
          });

          type RawComment = {
            id?: string;
            author?: string;
            message?: string;
            createdAt?: string;
            replies?: { id: string; message: string; createdAt: string }[];
          };
          const rawComments = (comments ?? []) as RawComment[];
          return {
            likes: engagement?.likes ?? 0,
            commentsCount: engagement?.comments ?? 0,
            comments: rawComments
              .filter((c) => Boolean(c.message))
              .map<EngagementComment>((c) => ({
                id: c.id || randomUUID(),
                author: c.author || `User on ${pp.platform}`,
                message: c.message as string,
                sentiment: undefined,
                replies: c.replies || [],
                createdAt: c.createdAt || new Date().toISOString(),
              })),
          };
        } catch (e) {
          console.error(
            `Failed to fetch engagement for platform post ${pp.id}:`,
            e
          );
          return { likes: 0, commentsCount: 0, comments: [] };
        }
      })
  );

  const totalLikes = perPostResults.reduce((sum, r) => sum + r.likes, 0);
  const liveComments: EngagementComment[] = perPostResults
    .flatMap((r) => r.comments)
    .slice(0, 50);

  // If platforms returned no live comments yet, surface any comments
  // the user has previously interacted with (replies/sentiment marks)
  // rather than throwing away that history. Don't synthesise mock
  // commenters anymore — an empty array is honest.
  const finalComments: EngagementComment[] =
    liveComments.length > 0
      ? liveComments
      : existing?.comments ?? [];

  const result: PostEngagement = {
    postId: id,
    likes: totalLikes,
    comments: finalComments,
  };

  // Update store
  if (existing) {
    const idx = store.findIndex((x) => x.postId === id);
    store[idx] = result;
  } else {
    store.unshift(result);
  }
  await writeJsonStore(FILE_NAME, store);

  void notifyPostEngagement({
    userId,
    postId: id,
    postLabel: post.title || post.content,
    prevLikes: prevTotalLikes,
    prevComments: prevTotalComments,
    newLikes: totalLikes,
    newComments: perPostResults.reduce((s, r) => s + r.commentsCount, 0),
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { id } = await params;
  const post = await prisma.post.findFirst({
    where: { id, userId, status: "PUBLISHED" },
    include: {
      platformPosts: {
        include: {
          socialAccount: true,
        },
      },
    },
  });
  if (!post) return NextResponse.json({ error: "Published post not found" }, { status: 404 });

  const body = await req.json();
  const { action, commentId, message, socialAccountId } = body as {
    action: "reply" | "analyze";
    commentId?: string;
    message?: string;
    socialAccountId?: string;
  };
  const store = await readJsonStore<PostEngagement[]>(FILE_NAME, []);
  const idx = store.findIndex((x) => x.postId === id);
  const current: PostEngagement = idx >= 0 ? store[idx] : { postId: id, likes: 0, comments: [] };

  if (action === "reply") {
    if (!commentId || !message?.trim()) {
      return NextResponse.json({ error: "commentId and message required" }, { status: 400 });
    }
    const cIdx = current.comments.findIndex((c) => c.id === commentId);
    if (cIdx < 0) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Try to post the reply to the actual platform
    let replyPosted = false;
    if (socialAccountId) {
      try {
        const platformPost = post.platformPosts.find((pp) => pp.socialAccountId === socialAccountId);
        if (platformPost && platformPost.externalId) {
          const account = platformPost.socialAccount;

          // For Zernio-connected accounts, use Zernio API to reply
          if (account.zernioAccountId) {
            console.log(`[Engagement] Posting reply via Zernio for account ${account.zernioAccountId}`);
            const zernioReplyId = await replyViaZernio(
              platformPost.externalId,
              account.zernioAccountId,
              message.trim(),
              commentId
            );

            if (zernioReplyId) {
              console.log(`[Engagement] Successfully posted reply to Zernio: ${zernioReplyId}`);
              replyPosted = true;
            } else {
              console.warn(`[Engagement] Zernio reply returned no ID`);
            }
          } else {
            console.warn(
              `[Engagement] Account ${account.id} is not Zernio-connected, cannot post reply via API`
            );
            // For legacy accounts, we would need platform-specific implementations
            // This is left as a future enhancement
          }
        }
      } catch (replyError) {
        console.error(`[Engagement] Failed to post reply to platform:`, replyError);
        // Continue - we'll still save it locally
      }
    }

    // Always save the reply locally as a record
    current.comments[cIdx].replies.push({
      id: randomUUID(),
      message: message.trim(),
      createdAt: new Date().toISOString(),
    });

    const status = replyPosted ? "posted" : "local-only";
    console.log(`[Engagement] Reply saved (${status}) for comment ${commentId}`);
  }

  if (action === "analyze") {
    const sentiments = await analyzeSentiment(current.comments.map((c) => c.message));
    current.comments = current.comments.map((comment, i) => ({
      ...comment,
      sentiment: sentiments[i] || comment.sentiment || "neutral",
    }));
  }

  if (idx >= 0) store[idx] = current;
  else store.unshift(current);
  await writeJsonStore(FILE_NAME, store);
  return NextResponse.json(current);
}
