import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId");
  const recipientId = searchParams.get("recipientId");
  const token = searchParams.get("token");

  if (!campaignId || !recipientId || !token) {
    return NextResponse.json({ success: false, message: "Missing RSVP parameters." }, { status: 400 });
  }

  try {
    const count = await prisma.$executeRaw`
      UPDATE "EmailCampaignRecipient"
      SET "rsvpStatus" = 'CONFIRMED', "rsvpAt" = NOW()
      WHERE "campaignId" = ${campaignId} AND "contactId" = ${recipientId}
    `;

    if (count === 0) {
      return NextResponse.json({ success: false, message: "Recipient record not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "RSVP confirmed. Thanks for your response!" });
  } catch (error) {
    console.error("RSVP error:", error);
    return NextResponse.json({ success: false, message: "Unable to process RSVP request." }, { status: 500 });
  }
}
