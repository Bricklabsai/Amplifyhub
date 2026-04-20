import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const [totalPosts, scheduledPosts, socialAccounts, recentPosts, analytics] = await Promise.all([
    prisma.post.count({ where: { userId } }),
    prisma.post.count({ where: { userId, status: "SCHEDULED" } }),
    prisma.socialAccount.count({ where: { userId, isActive: true } }),
    prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.analytics.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 7,
    }),
  ]);

  const totalFollowers = await prisma.socialAccount.aggregate({
    where: { userId },
    _sum: { followers: true },
  });

  return NextResponse.json({
    stats: {
      totalPosts,
      scheduledPosts,
      socialAccounts,
      totalFollowers: totalFollowers._sum.followers || 0,
    },
    recentPosts,
    analytics,
  });
}
