/**
 * Runs the post scheduler every minute during local `pnpm dev` so scheduled
 * posts publish without Inngest or Vercel Cron.
 */
let started = false;

export function startDevScheduler() {
  if (started || process.env.NODE_ENV !== "development") return;
  if (process.env.DISABLE_DEV_SCHEDULER === "1") return;
  started = true;

  const tick = async () => {
    try {
      const { processScheduledPosts } = await import("./services/schedulerService");
      const { processEngagementAlerts } = await import("./services/engagementAlertService");
      const result = await processScheduledPosts();
      const engagement = await processEngagementAlerts(5);
      if (result.processed > 0 || engagement.notified > 0) {
        console.log("[scheduler] dev tick:", { posts: result, engagement });
      }
    } catch (err) {
      console.error("[scheduler] dev tick error:", err);
    }
  };

  console.log("[scheduler] Dev mode: checking for due posts every 60s");
  void tick();
  setInterval(() => void tick(), 60_000);
}
