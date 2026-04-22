import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const groups = await prisma.audienceGroup.findMany({
    where: { userId },
    include: {
      contacts: {
        include: { contact: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const allContacts = groups.flatMap((group) => group.contacts.map((cg) => cg.contact));
  const uniqueContacts = Array.from(new Map(allContacts.map((c) => [c.id, c])).values());

  return NextResponse.json({
    contacts: uniqueContacts,
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      contactCount: group.contacts.length,
      contacts: group.contacts.map((cg) => cg.contact),
    })),
  });
}
