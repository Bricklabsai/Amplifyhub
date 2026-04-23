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

  if (emailRecipients.length > 0) {
    await sendBulkEmails({
      to: emailRecipients,
      subject: campaign.subject,
      content: campaign.htmlContent,
      textContent: campaign.textContent || undefined,
      campaignId: campaign.id
    });
  }

  await prisma.emailCampaign.update({
    where: { id },
    data: { 
      sentAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    recipients: emailRecipients.length,
    message: "Campaign resent successfully",
  });
}
