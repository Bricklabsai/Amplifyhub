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
    await prisma.post.update({
      where: { id: post.id },
      data: { status: "PUBLISHED", publishedAt: now },
    });
    // Create notification
    await prisma.notification.create({
      data: {
        userId: post.userId,
        title: "Post Published",
        message: `Your scheduled post has been published successfully.`,
        type: "success",
      },
    });
    published++;
  }

  return NextResponse.json({ processed: scheduledPosts.length, published });
}

export async function GET() {
  return NextResponse.json({ message: "Scheduler endpoint active", time: new Date().toISOString() });
}
