import { type NextRequest, NextResponse } from "next/server";
import { processScheduledPosts, processScheduledEmails } from "@/lib/services/schedulerService";

// This endpoint can be called by a cron job (e.g., Vercel Cron) to publish scheduled posts
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "cron-secret-amplifyhub";
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const postResults = await processScheduledPosts();
  const emailResults = await processScheduledEmails();

  return NextResponse.json({
    processed: postResults.processed + emailResults.processed,
    socialPublished: postResults.published,
    emailsProcessed: emailResults.emailsProcessed,
    message: `Processed ${postResults.processed} social posts and ${emailResults.processed} email campaigns.`
  });
}

export async function GET() {
  return NextResponse.json({ message: "Scheduler endpoint active", time: new Date().toISOString() });
}
