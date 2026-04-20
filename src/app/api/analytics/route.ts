import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "30");

  const since = new Date(Date.now() - days * 86400000);
  const analytics = await prisma.analytics.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  const platforms = await prisma.socialAccount.findMany({
    where: { userId },
    select: { platform: true, followers: true, accountName: true },
  });

  return NextResponse.json({ analytics, platforms });
}
