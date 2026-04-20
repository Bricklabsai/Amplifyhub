import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  if (params.id === "all") {
    await prisma.notification.updateMany({ where: { userId }, data: { read: true } });
  } else {
    await prisma.notification.updateMany({ where: { id: params.id, userId }, data: { read: true } });
  }
  return NextResponse.json({ success: true });
}
