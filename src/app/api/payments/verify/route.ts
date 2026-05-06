import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyTransaction } from '@/lib/paystack';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const paystackData = await verifyTransaction(reference);

    if (paystackData.status === 'success') {
      // Update transaction status
      const transaction = await prisma.transaction.update({
        where: { reference },
        data: {
          status: 'success',
          paidAt: new Date(paystackData.paid_at),
          paystackId: paystackData.id.toString(),
          channel: paystackData.channel,
        },
      });

      // Update user subscription
      // Note: If using Paystack Plans, the subscription might be handled via webhook too
      // but we can update it here for immediate feedback
      if (paystackData.plan) {
        const plan = await prisma.plan.findFirst({
          where: { paystackPlanCode: paystackData.plan },
        });

        if (plan) {
          await prisma.subscription.upsert({
            where: { userId: transaction.userId },
            update: {
              planId: plan.id,
              status: 'ACTIVE',
              paystackCustomerCode: paystackData.customer.customer_code,
            },
            create: {
              userId: transaction.userId,
              planId: plan.id,
              status: 'ACTIVE',
              paystackCustomerCode: paystackData.customer.customer_code,
            },
          });
        }
      }

      return NextResponse.json({ success: true, data: paystackData });
    }

    return NextResponse.json({ success: false, message: 'Transaction not successful' });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
