import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { initializePayment } from '@/lib/paynow';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId } = await req.json();
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        name: true,
        price: true,
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // If it's the free plan, handle it directly
    if (plan.price === 0) {
      await prisma.subscription.upsert({
        where: { userId: session.user.id },
        update: { planId: plan.id, status: 'ACTIVE' },
        create: { userId: session.user.id, planId: plan.id, status: 'ACTIVE' },
      });
      return NextResponse.json({ success: true, message: 'Subscribed to free plan' });
    }

    // Generate a unique invoice ID for this payment
    const invoiceId = `AH-${session.user.id}-${Date.now()}-${uuidv4().split('-')[0]}`;

    try {
      // Initialize Paynow payment
      const paynowResponse = await initializePayment(invoiceId, plan.price, [
        {
          name: `${plan.name} Plan - Monthly Subscription`,
          price: plan.price,
        },
      ]);

      // Create a pending transaction with Paynow details
      await prisma.transaction.create({
        data: {
          userId: session.user.id,
          amount: plan.price,
          currency: 'ZWL', // Zimbabwe currency
          reference: invoiceId,
          pollUrl: paynowResponse.pollUrl,
          status: 'pending',
        },
      });

      // Return Paynow payment response with redirect URL
      return NextResponse.json({
        success: true,
        redirectUrl: paynowResponse.redirectUrl,
        pollUrl: paynowResponse.pollUrl,
        reference: invoiceId,
      });
    } catch (error: any) {
      console.error('Paynow payment initialization error:', error);
      throw error;
    }
  } catch (error: any) {
    console.error('Payment initialization error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
