import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    const statusParam = searchParams.get("status");
    
    const validStatuses = ["ACTIVE", "CANCELLED", "EXPIRED"];
    const status = statusParam && validStatuses.includes(statusParam) ? statusParam : null;

    const where = status ? { status: status as any } : {};

    const [subscriptions, total, subscriptionStats] = await Promise.all([
      prisma.subscription.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          plan: { select: { id: true, name: true, price: true } },
        },
      }),
      prisma.subscription.count({ where }),
      prisma.subscription.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
    ]);

    const stats = {
      ACTIVE: subscriptionStats.find((s) => s.status === "ACTIVE")?._count.id || 0,
      CANCELLED: subscriptionStats.find((s) => s.status === "CANCELLED")?._count.id || 0,
      EXPIRED: subscriptionStats.find((s) => s.status === "EXPIRED")?._count.id || 0,
    };

    return NextResponse.json({
      subscriptions: subscriptions.map((sub: any) => ({
        id: sub.id,
        userName: sub.user.name,
        userEmail: sub.user.email,
        planName: sub.plan.name,
        planPrice: sub.plan.price,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        postsUsed: sub.postsUsed,
        aiTextUsed: sub.aiTextUsed,
        aiImageUsed: sub.aiImageUsed,
      })),
      stats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}
