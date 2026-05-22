import { type NextRequest, NextResponse } from "next/server";
import {
  processScheduledPosts,
  processScheduledEmails,
} from "@/lib/services/schedulerService";

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET || "cron-secret-amplifyhub";
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

async function runScheduler() {
  const postResults = await processScheduledPosts();
  const emailResults = await processScheduledEmails();

  return {
    processed: postResults.processed + emailResults.processed,
    social: postResults,
    emails: emailResults,
    message: `Processed ${postResults.processed} social post(s) and ${emailResults.processed} email campaign(s).`,
  };
}

/** Vercel Cron invokes this path with GET + Authorization: Bearer CRON_SECRET */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runScheduler();
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runScheduler();
  return NextResponse.json(result);
}
