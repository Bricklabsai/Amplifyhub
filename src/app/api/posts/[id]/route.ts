import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishPost } from "@/lib/services/publishPost";
import crypto from "node:crypto";

type SessionUserWithId = {
  id?: string;
};

function generateIdempotencyKey(userId: string, accountId: string, content: string, mediaUrls: string[]): string {
  const data = `${userId}:${accountId}:${content}:${mediaUrls.sort().join(",")}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as SessionUserWithId).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const post = await prisma.post.findFirst({ where: { id, userId } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  if (body?.action === "publish") {
    const selectedSocialAccountIds = Array.isArray(body.selectedSocialAccountIds)
      ? (body.selectedSocialAccountIds as string[])
      : [];
    if (selectedSocialAccountIds.length === 0) {
      return NextResponse.json({ error: "Select at least one social account." }, { status: 400 });
    }

    // Fetch full account details including tokens
    const accounts = await prisma.socialAccount.findMany({
      where: {
        userId,
        isActive: true,
        id: { in: selectedSocialAccountIds },
      },
    });

    if (accounts.length === 0) {
      return NextResponse.json({ error: "No valid social accounts selected." }, { status: 400 });
    }

    const now = new Date();
    const content = typeof body.content === "string" && body.content.trim() ? body.content.trim() : post.content;
    const mediaUrls = Array.isArray(body.mediaUrls) ? body.mediaUrls : post.mediaUrls;

    // Check for recent duplicate publishes using idempotency keys
    const accountKeys = accounts.map(a => ({
      accountId: a.id,
      key: generateIdempotencyKey(userId, a.id, content, mediaUrls)
    }));

    const existingPublishes = await prisma.platformPost.findMany({
      where: {
        idempotencyKey: { in: accountKeys.map(k => k.key) },
        status: "PUBLISHED",
      },
      select: { id: true, socialAccountId: true, externalId: true },
    });

    if (existingPublishes.length === accounts.length) {
      const accountNames = await prisma.socialAccount.findMany({
        where: { id: { in: existingPublishes.map(p => p.socialAccountId) } },
        select: { accountName: true, platform: true },
      });
      return NextResponse.json({
        error: "Duplicate publish detected",
        details: `Already published to: ${accountNames.map(a => a.accountName).join(", ")}.`,
        recentPublishes: existingPublishes.map(p => ({ platformPostId: p.id, externalId: p.externalId })),
      }, { status: 409 });
    }

    // Filter out accounts that already have a successful publish with this key
    const accountsToPublish = accounts.filter(a => 
      !existingPublishes.some(p => p.socialAccountId === a.id)
    );

    if (accountsToPublish.length === 0) {
       return NextResponse.json({ 
         message: "All selected accounts already published this content.",
         results: [] 
       });
    }

    // Publish to remaining platforms
    const publishResults = await publishPost({ accounts: accountsToPublish, content, mediaUrls });

    // Determine overall status
    const anySucceeded = Array.from(publishResults.values()).some(r => r.success);

    const result = await prisma.$transaction(async (tx) => {
      // Update or create platform posts with results
      for (const account of accountsToPublish) {
        const result = publishResults.get(account.id);
        const idempotencyKey = accountKeys.find(k => k.accountId === account.id)?.key;

        const existingPlatformPost = await tx.platformPost.findFirst({
          where: { postId: id, socialAccountId: account.id },
        });

        if (existingPlatformPost) {
          await tx.platformPost.update({
            where: { id: existingPlatformPost.id },
            data: {
              content,
              status: result?.success ? "PUBLISHED" : "FAILED",
              publishedAt: result?.success ? now : null,
              externalId: result?.externalId || existingPlatformPost.externalId,
              idempotencyKey: result?.success ? idempotencyKey : null,
            },
          });
        } else {
          await tx.platformPost.create({
            data: {
              postId: id,
              socialAccountId: account.id,
              platform: account.platform,
              content,
              status: result?.success ? "PUBLISHED" : "FAILED",
              publishedAt: result?.success ? now : null,
              externalId: result?.externalId,
              idempotencyKey: result?.success ? idempotencyKey : null,
            },
          });
        }
      }

      // Update main post status based on overall success
      const updatedPost = await tx.post.update({
        where: { id },
        data: {
          content,
          mediaUrls,
          status: anySucceeded ? "PUBLISHED" : "FAILED",
          publishedAt: anySucceeded ? now : null,
        },
      });

      return { post: updatedPost, results: publishResults };
    });

    return NextResponse.json(result);
  }

  // Handle scheduling and other updates
  const { content, title, status, scheduledAt, mediaUrls, selectedSocialAccountIds } = body;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedPost = await tx.post.update({
      where: { id },
      data: {
        content: content !== undefined ? content : undefined,
        title: title !== undefined ? title : undefined,
        status: status !== undefined ? status : undefined,
        scheduledAt: scheduledAt !== undefined ? (scheduledAt ? new Date(scheduledAt) : null) : undefined,
        mediaUrls: mediaUrls !== undefined ? mediaUrls : undefined,
      },
    });

    if (selectedSocialAccountIds !== undefined && Array.isArray(selectedSocialAccountIds)) {
      // If social accounts are provided, update PlatformPost records
      
      // 1. Delete platform posts not in the new selection
      await tx.platformPost.deleteMany({
        where: {
          postId: id,
          socialAccountId: { notIn: selectedSocialAccountIds },
        },
      });

      // 2. Add or update platform posts in the selection
      for (const accountId of selectedSocialAccountIds) {
        const account = await tx.socialAccount.findFirst({
          where: { id: accountId, userId },
        });

        if (account) {
          const existing = await tx.platformPost.findFirst({
            where: { postId: id, socialAccountId: accountId },
          });

          if (existing) {
            await tx.platformPost.update({
              where: { id: existing.id },
              data: {
                status: status || updatedPost.status,
                content: content || updatedPost.content,
              },
            });
          } else {
            await tx.platformPost.create({
              data: {
                postId: id,
                socialAccountId: accountId,
                platform: account.platform,
                content: content || updatedPost.content,
                status: status || updatedPost.status,
              },
            });
          }
        }
      }
    } else if (status !== undefined || content !== undefined) {
      // If status or content updated but no social accounts selection provided, 
      // update all existing PlatformPost records for this post
      await tx.platformPost.updateMany({
        where: { postId: id },
        data: {
          status: status !== undefined ? status : undefined,
          content: content !== undefined ? content : undefined,
        },
      });
    }

    return updatedPost;
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as SessionUserWithId).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const post = await prisma.post.findFirst({ where: { id, userId } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
