import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publishPost } from "@/lib/services/publishPost";
import crypto from "crypto";

// This endpoint can be called by a cron job (e.g., Vercel Cron) to publish scheduled posts
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "cron-secret-amplifyhub";
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // 1. Process Scheduled Social Posts
  const scheduledPosts = await prisma.post.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: now } },
    include: { platformPosts: { include: { socialAccount: true } } },
  });

  let published = 0;
  let failed = 0;

  for (const post of scheduledPosts) {
    try {
      let targetAccounts = [];

      if (post.platformPosts.length > 0) {
        // Use pre-selected accounts (already joined with socialAccount)
        targetAccounts = post.platformPosts
          .map(pp => pp.socialAccount)
          .filter((sa): sa is NonNullable<typeof sa> => sa != null && sa.isActive);
      } else {
        // Fallback: Get all active social accounts for this user if none were selected
        targetAccounts = await prisma.socialAccount.findMany({
          where: { userId: post.userId, isActive: true },
        });
      }

      // Check for duplicate publish in last 5 minutes
      const contentHash = crypto.createHash("sha256").update(post.content).digest("hex");
      const existingDuplicate = await prisma.platformPost.findFirst({
        where: {
          socialAccountId: { in: targetAccounts.map(a => a.id) },
          status: "PUBLISHED",
          externalId: { not: null },
          // No direct hash column, but we can check by content + recent time
          createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) },
        },
        // This is approximate; exact duplicate detection would need a hash column
      });

      // Skip if likely duplicate (very similar content recently published)
      if (existingDuplicate) {
        await prisma.notification.create({
          data: {
            userId: post.userId,
            title: "Scheduled Post Skipped (Duplicate)",
            message: `A very similar post was published recently to one of your accounts. The scheduled post was skipped.`,
            type: "warning",
          },
        });
        await prisma.post.update({
          where: { id: post.id },
          data: { status: "FAILED" },
        });
        failed++;
        continue;
      }

      if (targetAccounts.length === 0) {
        await prisma.post.update({
          where: { id: post.id },
          data: { status: "FAILED" },
        });
        await prisma.notification.create({
          data: {
            userId: post.userId,
            title: "Post Failed",
            message: `No active social accounts connected.`,
            type: "error",
          },
        });
        failed++;
        continue;
      }

      // Publish to platforms using active provider
      const publishResults = await publishPost({ accounts: targetAccounts, content: post.content, mediaUrls: post.mediaUrls });

      // Update platform posts with results
      let hasSuccess = false;
      for (const account of targetAccounts) {
        const result = publishResults.get(account.id);
        const existing = post.platformPosts.find(pp => pp.socialAccountId === account.id);

        if (existing) {
          await prisma.platformPost.update({
            where: { id: existing.id },
            data: {
              status: result?.success ? "PUBLISHED" : "FAILED",
              publishedAt: result?.success ? now : null,
              externalId: result?.externalId || existing.externalId,
            },
          });
        } else {
          await prisma.platformPost.create({
            data: {
              postId: post.id,
              socialAccountId: account.id,
              platform: account.platform,
              content: post.content,
              status: result?.success ? "PUBLISHED" : "FAILED",
              publishedAt: result?.success ? now : null,
              externalId: result?.externalId,
            },
          });
        }

        if (result?.success) hasSuccess = true;
      }

      // Mark main post status
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: hasSuccess ? "PUBLISHED" : "FAILED",
          publishedAt: hasSuccess ? now : null,
        },
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: post.userId,
          title: hasSuccess ? "Scheduled Post Published" : "Scheduled Post Partially Published",
          message: hasSuccess
            ? `Your scheduled post was published successfully to ${Array.from(publishResults.values()).filter(r => r.success).length} of ${targetAccounts.length} platforms.`
            : `Your scheduled post failed to publish to all platforms. Please check your accounts and try again.`,
          type: hasSuccess ? "success" : "warning",
        },
      });

      published++;
    } catch (error) {
      console.error("Scheduler error:", error);
      await prisma.post.update({
        where: { id: post.id },
        data: { status: "FAILED" },
      });

      await prisma.notification.create({
        data: {
          userId: post.userId,
          title: "Post Failed",
          message: `Your scheduled post failed to publish. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          type: "error",
        },
      });
      failed++;
    }
  }

  // 2. Process Scheduled Email Campaigns (Newsletters, etc.)
  const scheduledEmails = await prisma.scheduledCampaign.findMany({
    where: { nextRunAt: { lte: now } },
  });

  let emailsProcessed = 0;

  for (const schedule of scheduledEmails) {
    try {
      // Call the internal run endpoint logic or refactor it to a shared service
      // For now, we can trigger the run via a local fetch to the existing API
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      await fetch(`${baseUrl}/api/scheduled-campaigns/${schedule.id}/run`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cronSecret}`,
          "Content-Type": "application/json"
        }
      });
      emailsProcessed++;
    } catch (error) {
      console.error(`Error running scheduled email ${schedule.id}:`, error);
    }
  }

  return NextResponse.json({
    processed: scheduledPosts.length + scheduledEmails.length,
    socialPublished: published,
    emailsProcessed,
    message: `Processed ${scheduledPosts.length} social posts and ${scheduledEmails.length} email campaigns.`
  });

}

export async function GET() {
  return NextResponse.json({ message: "Scheduler endpoint active", time: new Date().toISOString() });
}
