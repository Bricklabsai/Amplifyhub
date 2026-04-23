import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const events = await req.json();

    if (!Array.isArray(events)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    for (const event of events) {
      const { event: eventType, campaignId, recipientId } = event;

      if (!campaignId || !recipientId) continue;

      if (eventType === "open") {
        await prisma.emailCampaignRecipient.updateMany({
          where: {
            campaignId,
            contactId: recipientId,
          },
          data: {
            opened: true,
          },
        });
      } else if (eventType === "click") {
        await prisma.emailCampaignRecipient.updateMany({
          where: {
            campaignId,
            contactId: recipientId,
          },
          data: {
            clicked: true,
          },
        });
      }

      // Update aggregate rates for the campaign
      const totalRecipients = await prisma.emailCampaignRecipient.count({
        where: { campaignId },
      });

      if (totalRecipients > 0) {
        const openedCount = await prisma.emailCampaignRecipient.count({
          where: { campaignId, opened: true },
        });
        const clickedCount = await prisma.emailCampaignRecipient.count({
          where: { campaignId, clicked: true },
        });

        await prisma.emailCampaign.update({
          where: { id: campaignId },
          data: {
            openRate: openedCount / totalRecipients,
            clickRate: clickedCount / totalRecipients,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
