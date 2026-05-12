import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true, subscription: { include: { plan: true } } },
    orderBy: { createdAt: "desc" },
  });
  const totalUsers = users.length;
  const totalRevenue = await prisma.subscription.aggregate({ where: { status: "ACTIVE" }, _count: true });
  return NextResponse.json({ users, totalUsers, activeSubscriptions: totalRevenue._count });
}
