import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { contacts, groupId } = body;

  if (!contacts || !Array.isArray(contacts)) {
    return NextResponse.json({ error: "Invalid contacts data" }, { status: 400 });
  }

  const created = [];
  for (const c of contacts) {
    if (!c.email) continue;
    const contact = await prisma.contact.upsert({
      where: { email: c.email },
      update: { firstName: c.firstName, lastName: c.lastName, company: c.company, phone: c.phone },
      create: { email: c.email, firstName: c.firstName, lastName: c.lastName, company: c.company, phone: c.phone },
    });
    if (groupId) {
      await prisma.contactGroup.upsert({
        where: { contactId_groupId: { contactId: contact.id, groupId } },
        update: {},
        create: { contactId: contact.id, groupId },
      });
    }
    created.push(contact);
  }

  return NextResponse.json({ imported: created.length });
}
