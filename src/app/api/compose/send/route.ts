import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendBulkEmails } from "@/lib/email";

type Channel = "EMAIL" | "WHATSAPP";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json();
  const {
    content,
    subject,
    channel,
    mediaUrls,
    groupIds,
    selectedContactIds,
    whatsappContactIds,
  }: {
    content: string;
    subject?: string;
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
    include: { contacts: { include: { contact: true } } },
  });

  const groupContacts = groups.flatMap((group) => group.contacts.map((cg) => cg.contact));
  
  const individualContacts = (selectedContactIds || []).length 
    ? await prisma.contact.findMany({ where: { id: { in: selectedContactIds } } })
    : [];

  // Combine and deduplicate contacts
  const allContactsMap = new Map();
  [...groupContacts, ...individualContacts].forEach(c => allContactsMap.set(c.id, c));
  const recipients = Array.from(allContactsMap.values());

  if (recipients.length === 0) {
    return NextResponse.json({ error: "Please choose at least one recipient." }, { status: 400 });
  }

  if (channel === "EMAIL") {
    const emailRecipients = recipients
      .filter(r => r.email)
      .map(r => ({
        id: r.id,
        email: r.email,
        firstName: r.firstName,
        lastName: r.lastName,
        company: r.company
      }));

    if (emailRecipients.length === 0) {
      return NextResponse.json({ error: "No recipients have a valid email address." }, { status: 400 });
    }

    const emailResult = await sendBulkEmails({
      to: emailRecipients,
      subject: subject || "Notification from AmplifyHub",
      content: content,
    });

    return NextResponse.json({
      success: emailResult.success,
      channel,
      attempted: emailRecipients.length,
      sent: emailResult.sent,
      failed: emailResult.failed,
      message: emailResult.success 
        ? `Successfully sent ${emailResult.sent} emails.`
        : `Failed to send emails: ${emailResult.error || "Unknown error"}`,
      details: emailResult.results
    });
  }

  // Simulation response for WHATSAPP (to be implemented later)
  const sentTo = recipients.filter((r) => r.phone);
  return NextResponse.json({
    success: true,
    channel,
    attempted: recipients.length,
    sent: sentTo.length,
    mediaCount: (mediaUrls || []).length,
    message: `${channel} message queued for ${sentTo.length} recipient(s).`,
  });
}
