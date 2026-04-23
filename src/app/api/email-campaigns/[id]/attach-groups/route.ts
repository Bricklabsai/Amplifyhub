import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { id } = await params;
  const body = await req.json();
  const { groupIds } = body;

  const campaign = await prisma.emailCampaign.findFirst({
    where: { id, userId },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get all contacts from selected groups
  const groups = await prisma.audienceGroup.findMany({
    where: { userId, id: { in: groupIds || [] } },
    include: { contacts: { include: { contact: true } } },
  });

  const allContacts = groups.flatMap((group) => group.contacts.map((cg) => cg.contact));
  const uniqueContacts = Array.from(new Map(allContacts.map(c => [c.id, c])).values());

  // Delete existing recipients and add new ones
  await prisma.$transaction([
    prisma.emailCampaignRecipient.deleteMany({ where: { campaignId: id } }),
    prisma.emailCampaignRecipient.createMany({
      data: uniqueContacts.map((contact) => ({
        campaignId: id,
        contactId: contact.id,
      })),
      skipDuplicates: true,
    })
  ]);

  return NextResponse.json({
    success: true,
    recipientsAdded: uniqueContacts.length,
    groups: groups.length,
    message: `Added ${uniqueContacts.length} recipients from ${groups.length} groups`,
  });
}
