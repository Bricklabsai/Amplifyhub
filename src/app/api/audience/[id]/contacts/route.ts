import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contacts = await prisma.contactGroup.findMany({
    where: { groupId: params.id },
    include: { contact: true },
  });
  return NextResponse.json(contacts.map((c) => c.contact));
}
