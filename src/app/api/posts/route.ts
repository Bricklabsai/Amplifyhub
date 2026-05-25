import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAndIncrementUsage } from "@/lib/usage";
import { validateAccountsMedia } from "@/lib/media-requirements";
import type { Platform } from "@/generated/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = Number.parseInt(searchParams.get("page") || "1");
  const limit = Number.parseInt(searchParams.get("limit") || "20");

  const where: any = { userId };
  const now = new Date();
  if (status === "queued") {
    where.status = "SCHEDULED";
    where.OR = [
      { scheduleSource: "processing" },
      { scheduledAt: { lte: now } },
    ];
  } else if (status && status !== "all") {
    where.status = status;
    if (status === "SCHEDULED") {
      where.OR = [{ scheduledAt: { gt: now } }, { scheduledAt: null }];
      where.NOT = { scheduleSource: "processing" };
    }
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        platformPosts: {
          include: {
            socialAccount: {
              select: {
                id: true,
                platform: true,
                accountName: true,
              },
            },
          },
        },
      },
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({ posts, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  // Check usage limits
  const usage = await checkAndIncrementUsage(userId, "posts");
  if (!usage.allowed) {
    return NextResponse.json({ 
      error: "Monthly post limit reached. Please upgrade your plan.",
      limit: usage.limit,
      current: usage.current,
      upgradeRequired: true
    }, { status: 403 });
  }

  const body = await req.json();
  const { content, title, status, scheduledAt, campaignId, mediaUrls, selectedSocialAccountIds } = body;

  if (!content) return NextResponse.json({ error: "Content is required" }, { status: 400 });

  const socialAccountIds = Array.isArray(selectedSocialAccountIds) ? selectedSocialAccountIds : [];
  const postStatus = status || "DRAFT";

  if (postStatus === "SCHEDULED") {
    if (!scheduledAt) {
      return NextResponse.json(
        { error: "scheduledAt is required for scheduled posts" },
        { status: 400 }
      );
    }
    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) {
      return NextResponse.json({ error: "Invalid scheduledAt date" }, { status: 400 });
    }
    if (when.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Schedule time must be in the future" },
        { status: 400 }
      );
    }
    if (socialAccountIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one social account to schedule" },
        { status: 400 }
      );
    }

    const scheduleAccounts = await prisma.socialAccount.findMany({
      where: { userId, id: { in: socialAccountIds } },
      select: { platform: true },
    });
    const mediaCheck = validateAccountsMedia(
      scheduleAccounts as { platform: Platform }[],
      Array.isArray(mediaUrls) ? mediaUrls : []
    );
    if (!mediaCheck.valid) {
      return NextResponse.json(
        { error: mediaCheck.errors.join(" "), mediaErrors: mediaCheck.errors },
        { status: 400 }
      );
    }
  }

  const post = await prisma.$transaction(async (tx) => {
    const createdPost = await tx.post.create({
      data: {
        userId,
        content,
        title,
        status: postStatus,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        scheduleSource: postStatus === "SCHEDULED" ? "manual" : null,
        campaignId,
        mediaUrls: mediaUrls || [],
      },
    });

    if (socialAccountIds.length > 0) {
      const accounts = await tx.socialAccount.findMany({
        where: {
          id: { in: socialAccountIds },
          userId,
        },
      });

      for (const account of accounts) {
        await tx.platformPost.create({
          data: {
            postId: createdPost.id,
            socialAccountId: account.id,
            platform: account.platform,
            content,
            status: postStatus === "PUBLISHED" ? "PUBLISHED" : (postStatus === "SCHEDULED" ? "SCHEDULED" : "DRAFT"),
          },
        });
      }
    }

    return createdPost;
  });

  return NextResponse.json(post, { status: 201 });
}
