import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // I need to verify where authOptions is
import { prisma } from '@/lib/prisma';
import { initializeTransaction } from '@/lib/paystack';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId } = await req.json();
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // If it's the free plan, we might handle it differently or just return success
    if (plan.price === 0) {
      // Update user subscription to free plan directly
      await prisma.subscription.upsert({
        where: { userId: session.user.id as string },
        update: { planId: plan.id, status: 'ACTIVE' },
        create: { userId: session.user.id as string, planId: plan.id, status: 'ACTIVE' },
      });
      return NextResponse.json({ success: true, message: 'Subscribed to free plan' });
    }

    const callbackUrl = `${process.env.NEXTAUTH_URL}/dashboard/billing/verify`;
    const paystackData = await initializeTransaction(
      session.user.email,
      plan.price,
      callbackUrl,
      plan.paystackPlanCode || undefined
    );

    // Create a pending transaction
    await prisma.transaction.create({
      data: {
        userId: session.user.id as string,
        amount: plan.price,
        reference: paystackData.reference,
        status: 'pending',
      },
    });

    return NextResponse.json(paystackData);
  } catch (error: any) {
    console.error('Payment initialization error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
