import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get dashboard metrics
    const [
      totalUsers,
      activeSubscriptions,
      totalRevenue,
      totalTransactions,
      platformStatus,
      recentUsers,
      topPerfomingCampaigns,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.transaction.aggregate({
        where: { status: "success" },
        _sum: { amount: true },
      }),
      prisma.transaction.count({ where: { status: "success" } }),
      prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, createdAt: true, subscription: true },
      }),
      prisma.campaign.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        where: { status: "ACTIVE" },
        include: { user: { select: { name: true, email: true } } },
      }),
    ]);

    return NextResponse.json({
      totalUsers,
      activeSubscriptions,
      totalRevenue: totalRevenue._sum.amount || 0,
      totalTransactions,
      newUsersThisMonth: platformStatus,
      recentUsers,
      topPerfomingCampaigns,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
