import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendBulkEmails } from "@/lib/email";

function formatPosts(posts: any[]) {
  return posts
    .map(
      (post) => `
        <div style="margin-bottom: 20px; border: 1px solid #eee; padding: 15px; border-radius: 8px;">
          <h3 style="margin-top: 0;">${post.title}</h3>
          <p>${post.content.substring(0, 200)}...</p>
          <a href="${process.env.NEXTAUTH_URL}/posts/${post.id}" style="color: #7c3aed; text-decoration: none; font-weight: bold;">Read more →</a>
        </div>
      `
    )
    .join("");
}

function computeNextRun(now: Date, frequency: string) {
  const next = new Date(now);
  if (frequency === "DAILY") next.setDate(next.getDate() + 1);
  else if (frequency === "WEEKLY") next.setDate(next.getDate() + 7);
  else if (frequency === "MONTHLY") next.setMonth(next.getMonth() + 1);
  else next.setDate(next.getDate() + 7);
  return next;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const schedule = await prisma.scheduledCampaign.findFirst({ where: { id, userId } });
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let htmlContent = schedule.htmlContent;
  if (schedule.templateId) {
    const template = await prisma.emailTemplate.findUnique({ where: { id: schedule.templateId } });
    if (template) htmlContent = template.htmlContent;
  }

  if (schedule.sourceType === "latest_posts" && htmlContent.includes("{{latest_posts}}")) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const latestPosts = await prisma.post.findMany({
      where: {
        userId,
        status: "PUBLISHED",
        publishedAt: { gte: sevenDaysAgo },
      },
      orderBy: { publishedAt: "desc" },
      take: 5,
    });
    htmlContent = htmlContent.replace(/{{latest_posts}}/g, formatPosts(latestPosts));
  }

  const recipients = await prisma.contact.findMany({
    where: {
      groups: {
        some: {
          group: {
            userId,
          },
        },
      },
    },
    select: { id: true, email: true, firstName: true, lastName: true, company: true },
  });

  const result = await sendBulkEmails({
    to: recipients.map((contact) => ({
      id: contact.id,
      email: contact.email,
      firstName: contact.firstName ?? undefined,
      lastName: contact.lastName ?? undefined,
      company: contact.company ?? undefined,
    })),
    subject: schedule.subject,
    content: htmlContent,
    campaignId: schedule.id,
  });

  const nextRunAt = computeNextRun(new Date(), schedule.frequency);
  await prisma.scheduledCampaign.update({
    where: { id },
    data: {
      lastRunAt: new Date(),
      nextRunAt,
      failureCount: result.success ? 0 : schedule.failureCount + 1,
      lastError: result.failed > 0 ? `Failed to send to ${result.failed} recipients` : null,
    },
  });

  return NextResponse.json({ success: true, result, nextRunAt });
}
