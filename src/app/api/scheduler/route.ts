import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// This endpoint can be called by a cron job (e.g., Vercel Cron) to publish scheduled posts
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "cron-secret-amplifyhub";
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const scheduledPosts = await prisma.post.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: now } },
  });

  let published = 0;
  for (const post of scheduledPosts) {
    try {
      // Get social accounts for this user
      const socialAccounts = await prisma.socialAccount.findMany({
        where: { userId: post.userId, isActive: true },
      });

      // Create platform posts for each connected account
      for (const account of socialAccounts) {
        await prisma.platformPost.create({
          data: {
            postId: post.id,
            socialAccountId: account.id,
            platform: account.platform,
            content: post.content,
            status: "PUBLISHED",
            publishedAt: now,
          },
        });
      }

      // Mark main post as published
      await prisma.post.update({
        where: { id: post.id },
        data: { status: "PUBLISHED", publishedAt: now },
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: post.userId,
          title: "Scheduled Post Published",
          message: `Your scheduled post was published successfully to ${socialAccounts.length} platforms.`,
          type: "success",
        },
      });

      published++;
    } catch (error) {
      await prisma.post.update({
        where: { id: post.id },
        data: { status: "FAILED" },
      });

      await prisma.notification.create({
        data: {
          userId: post.userId,
          title: "Post Failed",
          message: `Your scheduled post failed to publish. Please try again.`,
          type: "error",
        },
      });
    }
  }

  return NextResponse.json({ processed: scheduledPosts.length, published });
}

export async function GET() {
  return NextResponse.json({ message: "Scheduler endpoint active", time: new Date().toISOString() });
}
