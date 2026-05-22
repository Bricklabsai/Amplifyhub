import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        reference: true,
        channel: true,
        paidAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      subscription,
      transactions: transactions.map((tx) => ({
        id: tx.id,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        reference: tx.reference,
        channel: tx.channel,
        paidAt: tx.paidAt?.toISOString() ?? null,
        createdAt: tx.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('Billing info error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
