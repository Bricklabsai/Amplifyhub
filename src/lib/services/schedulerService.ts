import { prisma } from "@/lib/prisma";
import { publishPost, serializePublishResults } from "@/lib/services/publishPost";

const PROCESSING_LOCK = "processing";
const STALE_LOCK_MS = 10 * 60 * 1000;

/**
 * Picks up posts whose scheduledAt has passed and publishes them via Zernio.
 * Called every minute by Vercel Cron (/api/scheduler) and the dev scheduler.
 */
export async function processScheduledPosts() {
  const now = new Date();

  // Recover posts stuck in "processing" after a crash or timeout
  await prisma.post.updateMany({
    where: {
      status: "SCHEDULED",
      scheduleSource: PROCESSING_LOCK,
      updatedAt: { lt: new Date(Date.now() - STALE_LOCK_MS) },
    },
    data: { scheduleSource: "manual" },
  });

  const scheduledPosts = await prisma.post.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
      OR: [
        { scheduleSource: null },
        { scheduleSource: { not: PROCESSING_LOCK } },
      ],
    },
    include: { platformPosts: { include: { socialAccount: true } } },
    orderBy: { scheduledAt: "asc" },
  });

  let published = 0;
  let failed = 0;

  if (scheduledPosts.length > 0) {
    console.log(
      `[scheduler] ${scheduledPosts.length} due post(s) at ${now.toISOString()}`
    );
  }

  for (const post of scheduledPosts) {
    const claimed = await prisma.post.updateMany({
      where: {
        id: post.id,
        status: "SCHEDULED",
        OR: [
          { scheduleSource: null },
          { scheduleSource: { not: PROCESSING_LOCK } },
        ],
      },
      data: { scheduleSource: PROCESSING_LOCK },
    });

    if (claimed.count === 0) {
      console.log(`[scheduler] Post ${post.id} already being processed, skipping`);
      continue;
    }

    try {
      let targetAccounts = [];

      if (post.platformPosts.length > 0) {
        targetAccounts = post.platformPosts
          .map((pp) => pp.socialAccount)
          .filter((sa): sa is NonNullable<typeof sa> => sa != null && sa.isActive);
      } else {
        targetAccounts = await prisma.socialAccount.findMany({
          where: { userId: post.userId, isActive: true },
        });
      }

      if (targetAccounts.length === 0) {
        await prisma.post.update({
          where: { id: post.id },
          data: { status: "FAILED", scheduleSource: "manual" },
        });
        await prisma.notification.create({
          data: {
            userId: post.userId,
            title: "Scheduled Post Failed",
            message: "No active social accounts were connected when this post was due.",
            type: "error",
          },
        });
        failed++;
        continue;
      }

      console.log(
        `[scheduler] Publishing post ${post.id} to ${targetAccounts.length} account(s)`
      );

      const publishResults = await publishPost({
        accounts: targetAccounts,
        content: post.content,
        mediaUrls: post.mediaUrls,
      });

      const serialized = serializePublishResults(publishResults);
      const successCount = Object.values(serialized).filter((r) => r.success).length;
      const hasSuccess = successCount > 0;

      if (!hasSuccess) {
        const errors = Object.values(serialized)
          .map((r) => r.error)
          .filter(Boolean);
        console.error(
          `[scheduler] Post ${post.id} failed on all platforms:`,
          errors.join("; ") || "unknown"
        );
      }

      for (const account of targetAccounts) {
        const result = publishResults.get(account.id);
        const existing = post.platformPosts.find(
          (pp) => pp.socialAccountId === account.id
        );

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
      }

      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: hasSuccess ? "PUBLISHED" : "FAILED",
          publishedAt: hasSuccess ? now : null,
          scheduleSource: "manual",
        },
      });

      const allFailed = successCount === 0;
      const partial = hasSuccess && successCount < targetAccounts.length;

      await prisma.notification.create({
        data: {
          userId: post.userId,
          title: allFailed
            ? "Scheduled Post Failed"
            : partial
              ? "Scheduled Post Partially Published"
              : "Scheduled Post Published",
          message: allFailed
            ? `Your scheduled post could not be published. ${Object.values(serialized)
                .map((r) => r.error)
                .filter(Boolean)
                .join("; ") || "Check your accounts and media, then try again."}`
            : partial
              ? `Published to ${successCount} of ${targetAccounts.length} accounts.`
              : `Your scheduled post was published to ${successCount} account(s).`,
          type: allFailed ? "error" : partial ? "warning" : "success",
        },
      });

      if (hasSuccess) published++;
      else failed++;
    } catch (error) {
      console.error(`[scheduler] Post ${post.id} error:`, error);
      await prisma.post.update({
        where: { id: post.id },
        data: { status: "FAILED", scheduleSource: "manual" },
      });

      await prisma.notification.create({
        data: {
          userId: post.userId,
          title: "Scheduled Post Failed",
          message: `Your scheduled post failed to publish. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          type: "error",
        },
      });
      failed++;
    }
  }

  return {
    processed: scheduledPosts.length,
    published,
    failed,
  };
}

export async function processScheduledEmails() {
  const now = new Date();
  const cronSecret = process.env.CRON_SECRET || "cron-secret-amplifyhub";

  const scheduledEmails = await prisma.scheduledCampaign.findMany({
    where: { nextRunAt: { lte: now } },
  });

  let emailsProcessed = 0;

  for (const schedule of scheduledEmails) {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      await fetch(`${baseUrl}/api/scheduled-campaigns/${schedule.id}/run`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cronSecret}`,
          "Content-Type": "application/json",
        },
      });
      emailsProcessed++;
    } catch (error) {
      console.error(`Error running scheduled email ${schedule.id}:`, error);
    }
  }

  return {
    processed: scheduledEmails.length,
    emailsProcessed,
  };
}
