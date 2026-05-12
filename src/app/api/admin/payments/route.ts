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
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [transactions, total, paymentStats, dailyRevenue] = await Promise.all([
      prisma.transaction.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.groupBy({
        by: ["status"],
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.transaction.groupBy({
        by: ["createdAt"],
        _sum: { amount: true },
        _count: { id: true },
        where: { status: "success" },
      }),
    ]);

    const stats = {
      total: paymentStats.reduce((acc, stat) => acc + (stat._sum.amount || 0), 0),
      successful: paymentStats.find((s) => s.status === "success")?._sum.amount || 0,
      failed: paymentStats.find((s) => s.status === "failed")?._sum.amount || 0,
      pending: paymentStats.find((s) => s.status === "pending")?._sum.amount || 0,
    };

    return NextResponse.json({
      transactions: transactions.map((tx: any) => ({
        id: tx.id,
        userId: tx.userId,
        userName: tx.user.name,
        userEmail: tx.user.email,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        channel: tx.channel,
        reference: tx.reference,
        paidAt: tx.paidAt,
        createdAt: tx.createdAt,
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
    console.error("Error fetching transactions:", error);
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}
