import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendBulkEmails } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { id } = await params;
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

  const emailRecipients = campaign.recipients
    .filter(r => r.contact.email)
    .map((r) => ({
      id: r.contactId,
      email: r.contact.email,
      firstName: r.contact.firstName || undefined,
      lastName: r.contact.lastName || undefined,
      company: r.contact.company || undefined,
    }));

  const sendgridApiKey = process.env.SENDGRID_API_KEY;

  if (emailRecipients.length > 0) {
    const emailResult = await sendBulkEmails({
      to: emailRecipients,
      subject: campaign.subject,
      content: campaign.htmlContent,
      textContent: campaign.textContent || undefined,
      campaignId: campaign.id
    });

    if (!emailResult.success && sendgridApiKey) {
      return NextResponse.json({ error: `SendGrid send failed: ${JSON.stringify(emailResult.results)}` }, { status: 500 });
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

  return NextResponse.json({
    success: true,
    provider: sendgridApiKey ? "sendgrid" : "simulation",
    recipients: emailRecipients.length,
    message: sendgridApiKey
      ? "Campaign sent successfully with SendGrid."
      : "Campaign sent successfully (simulation, set SENDGRID_API_KEY to enable real sending).",
  });
}
