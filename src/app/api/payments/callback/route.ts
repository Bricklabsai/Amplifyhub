import { NextResponse } from 'next/server';
import { pollTransactionStatus } from '@/lib/paynow';
import { prisma } from '@/lib/prisma';
import { notifyPaymentSuccess } from '@/lib/notifications';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get('reference') || searchParams.get('merchantReference');

    if (!reference) {
      return NextResponse.redirect(
        new URL('/dashboard/billing?error=no-reference', req.url)
      );
    }

    try {
      // Find the transaction to get pollUrl
      const transaction = await prisma.transaction.findUnique({
        where: { reference },
        include: { user: true },
      });

      if (!transaction) {
        return NextResponse.redirect(
          new URL('/dashboard/billing?error=transaction-not-found', req.url)
        );
      }

      if (!transaction.pollUrl) {
        return NextResponse.redirect(
          new URL('/dashboard/billing?error=no-poll-url', req.url)
        );
      }

      // Poll Paynow for transaction status
      const paynowData = await pollTransactionStatus(transaction.pollUrl);

      if (paynowData.status === 'paid' || paynowData.status === 'success') {
        // Update transaction status
        await prisma.transaction.update({
          where: { reference },
          data: {
            status: 'success',
            paidAt: new Date(),
            channel: paynowData.method || 'paynow',
          },
        });

        // Find the plan that was being purchased
        // For Paynow, we need to track plan selection differently
        // For now, we'll update subscription based on stored data
        // In production, you'd want to track the planId in the transaction or reference
        const userSubscription = await prisma.subscription.findUnique({
          where: { userId: transaction.userId },
        });

        if (userSubscription) {
          // User already has a subscription, this is an upgrade
          await prisma.subscription.update({
            where: { userId: transaction.userId },
            data: {
              status: 'ACTIVE',
              paynowPaymentId: reference,
              startDate: new Date(),
            },
          });
        }

        void notifyPaymentSuccess({
          userId: transaction.userId,
          amount: transaction.amount,
          currency: transaction.currency,
          reference,
        });

        // Redirect to billing with success message
        return NextResponse.redirect(
          new URL('/dashboard/billing?payment=success', req.url)
        );
      } else if (paynowData.status === 'pending' || paynowData.status === 'processing') {
        // Payment is still processing, redirect with pending message
        return NextResponse.redirect(
          new URL('/dashboard/billing?payment=pending', req.url)
        );
      }

      return NextResponse.redirect(
        new URL('/dashboard/billing?error=payment-failed', req.url)
      );
    } catch (error: any) {
      console.error('Payment callback error:', error);
      return NextResponse.redirect(
        new URL(`/dashboard/billing?error=${encodeURIComponent(error.message || 'callback-failed')}`, req.url)
      );
    }
  } catch (error: any) {
    console.error('Callback error:', error);
    return NextResponse.redirect(new URL('/dashboard/billing?error=callback-error', req.url));
  }
}
