import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAndIncrementUsage } from "@/lib/usage";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: any = { userId };
  if (status && status !== "all") where.status = status;

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

  const post = await prisma.$transaction(async (tx) => {
    const createdPost = await tx.post.create({
      data: {
        userId,
        content,
        title,
        status: status || "DRAFT",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
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
            status: status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
          },
        });
      }
    }

    return createdPost;
  });

  return NextResponse.json(post, { status: 201 });
}
