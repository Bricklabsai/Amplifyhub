import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendBulkEmails } from "@/lib/email";
import { notifyCampaignStarted } from "@/lib/notifications";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { id } = await params;
  let replyTo: string | undefined;
  let senderName: string | undefined;
  try {
    const body = await req.json();
    replyTo = typeof body.replyTo === "string" ? body.replyTo.trim() : undefined;
    senderName = typeof body.senderName === "string" ? body.senderName.trim() : undefined;
  } catch {
    // empty body is fine
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!replyTo) replyTo = user?.email || undefined;
  if (!senderName) senderName = user?.name || undefined;

  const campaign = await prisma.emailCampaign.findFirst({ 
    where: { id, userId },
    include: {
      recipients: {
        include: {
          contact: true
        }
      }
    }
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const emailRecipients = await prisma.$queryRaw<Record<string, string | null>[]>`
    SELECT c.id, c.email, c."firstName", c."lastName", c.company
    FROM "EmailCampaignRecipient" r
    JOIN "Contact" c ON c.id = r."contactId"
    WHERE r."campaignId" = ${id}
      AND c.email IS NOT NULL
      AND c."isUnsubscribed" = false
  `;

  const formattedRecipients = emailRecipients
    .filter((recipient) => recipient.email)
    .map((recipient) => ({
      id: recipient.id as string,
      email: recipient.email as string,
      firstName: (recipient["firstName"] as string) || undefined,
      lastName: (recipient["lastName"] as string) || undefined,
      company: (recipient.company as string) || undefined,
    }));

  const resendApiKey = process.env.RESEND_API_KEY;

  if (formattedRecipients.length > 0) {
    const emailResult = await sendBulkEmails({
      to: formattedRecipients,
      subject: campaign.subject,
      content: campaign.htmlContent,
      textContent: campaign.textContent || undefined,
      campaignId: campaign.id,
      replyTo,
      senderName,
    });

    if (!emailResult.success && resendApiKey) {
      return NextResponse.json({ error: `Resend send failed: ${JSON.stringify(emailResult.results)}` }, { status: 500 });
    }
  }

  await prisma.emailCampaign.update({
    where: { id },
    data: { 
      status: "SENT", 
      sentAt: new Date(),
      // In a real scenario, rates start at 0 and grow via tracking webhooks
      openRate: 0, 
      clickRate: 0 
    },
  });

  void notifyCampaignStarted({
    userId,
    campaignId: id,
    campaignName: campaign.name,
    recipientCount: formattedRecipients.length,
  });

  return NextResponse.json({
    success: true,
    provider: resendApiKey ? "resend" : "simulation",
    recipients: formattedRecipients.length,
    message: resendApiKey
      ? "Campaign sent successfully with Resend."
      : "Campaign sent successfully (simulation, set RESEND_API_KEY to enable real sending).",
  });
}
