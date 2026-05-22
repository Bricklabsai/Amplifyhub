import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseWebhookPayload, verifyWebhookSignature } from '@/lib/paynow';
import { notifyPaymentFailed, notifyPaymentSuccess } from '@/lib/notifications';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const signature = req.headers.get('x-paynow-signature') || req.headers.get('signature');

    // Note: Paynow webhook signature verification may differ from Paystack
    // Implement according to Paynow's documentation
    // For now, we'll process the webhook if it contains valid data
    if (signature && !verifyWebhookSignature(body, signature)) {
      console.warn('Invalid Paynow webhook signature');
      // You may want to reject invalid signatures, but for now we'll log and continue
      // return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Parse Paynow webhook payload
    const paynowData = parseWebhookPayload(body);
    console.log('Paynow Webhook Event:', paynowData);

    // Handle payment status update
    await handlePaymentUpdate(paynowData);

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Handle payment status updates from Paynow
 * Paynow sends webhook notifications for payment status changes
 */
async function handlePaymentUpdate(paynowData: any) {
  const { referenceId, status, amount, pollUrl } = paynowData;

  if (!referenceId) {
    console.error('No reference ID in Paynow webhook');
    return;
  }

  // Find the transaction
  const transaction = await prisma.transaction.findUnique({
    where: { reference: referenceId },
    include: { user: true },
  });

  if (!transaction) {
    console.warn(`Transaction not found for reference: ${referenceId}`);
    return;
  }

  // Update transaction status based on Paynow response
  if (status === 'paid' || status === 'success') {
    await prisma.transaction.update({
      where: { reference: referenceId },
      data: {
        status: 'success',
        paidAt: new Date(),
        pollUrl: pollUrl || transaction.pollUrl,
      },
    });

    // Create or update user subscription
    // Note: In Paynow integration, you'll need to track which plan was purchased
    // This could be done by including planId in the invoice reference or in metadata
    const userSubscription = await prisma.subscription.findUnique({
      where: { userId: transaction.userId },
    });

    if (userSubscription) {
      // Update existing subscription
      await prisma.subscription.update({
        where: { userId: transaction.userId },
        data: {
          status: 'ACTIVE',
          paynowPaymentId: referenceId,
          startDate: new Date(),
          // Reset usage counters on new billing period
          postsUsed: 0,
          aiTextUsed: 0,
          aiImageUsed: 0,
          lastResetAt: new Date(),
        },
      });
    }

    void notifyPaymentSuccess({
      userId: transaction.userId,
      amount: amount ?? transaction.amount,
      currency: transaction.currency,
      reference: referenceId,
    });
  } else if (status === 'failed' || status === 'cancelled') {
    // Update transaction as failed
    await prisma.transaction.update({
      where: { reference: referenceId },
      data: {
        status: status === 'failed' ? 'failed' : 'cancelled',
        pollUrl: pollUrl || transaction.pollUrl,
      },
    });

    // Cancel subscription if it exists
    const userSubscription = await prisma.subscription.findUnique({
      where: { userId: transaction.userId },
    });

    if (userSubscription) {
      await prisma.subscription.update({
        where: { userId: transaction.userId },
        data: {
          status: 'CANCELLED',
          endDate: new Date(),
        },
      });
    }

    void notifyPaymentFailed({
      userId: transaction.userId,
      reference: referenceId,
      reason:
        status === 'cancelled'
          ? 'Your payment was cancelled.'
          : 'Your payment could not be completed.',
    });
  } else if (status === 'pending' || status === 'processing') {
    // Keep transaction in pending state
    await prisma.transaction.update({
      where: { reference: referenceId },
      data: {
        status: 'pending',
        pollUrl: pollUrl || transaction.pollUrl,
      },
    });
  }
}
