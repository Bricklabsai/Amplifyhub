import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Channel = "EMAIL" | "WHATSAPP";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json();
  const {
    content,
    channel,
    mediaUrls,
    groupIds,
    selectedContactIds,
    whatsappContactIds,
  }: {
    content: string;
    channel: Channel;
    mediaUrls?: string[];
    groupIds?: string[];
    selectedContactIds?: string[];
    whatsappContactIds?: string[];
  } = body;

  if (!content?.trim()) return NextResponse.json({ error: "Content is required" }, { status: 400 });
  if (!channel || !["EMAIL", "WHATSAPP"].includes(channel)) {
    return NextResponse.json({ error: "Valid channel is required" }, { status: 400 });
  }

  const groups = await prisma.audienceGroup.findMany({
    where: { userId, id: { in: groupIds || [] } },
    include: { contacts: true },
  });

  const groupContactIds = groups.flatMap((group) => group.contacts.map((cg) => cg.contactId));
  const allTargetIds = Array.from(
    new Set([...(selectedContactIds || []), ...groupContactIds, ...(whatsappContactIds || [])])
  );

  const recipients = allTargetIds.length
    ? await prisma.contact.findMany({ where: { id: { in: allTargetIds } } })
    : [];

  if (recipients.length === 0) {
    return NextResponse.json({ error: "Please choose at least one recipient." }, { status: 400 });
  }

  // Simulation response so UI can complete end-to-end without provider setup.
  // Integrate real ESP/WhatsApp APIs here when credentials are configured.
  const sentTo = channel === "EMAIL" ? recipients.filter((r) => r.email) : recipients.filter((r) => r.phone);
  return NextResponse.json({
    success: true,
    channel,
    attempted: recipients.length,
    sent: sentTo.length,
    mediaCount: (mediaUrls || []).length,
    message: `${channel} message queued for ${sentTo.length} recipient(s).`,
  });
}
