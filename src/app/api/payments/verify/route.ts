import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pollTransactionStatus } from '@/lib/paynow';

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

    // Find the transaction to get pollUrl
    const transaction = await prisma.transaction.findUnique({
      where: { reference },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Verify user owns this transaction
    if (transaction.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If no pollUrl, transaction might be invalid
    if (!transaction.pollUrl) {
      return NextResponse.json({ 
        success: false, 
        status: transaction.status,
        message: 'No poll URL found for this transaction' 
      });
    }

    try {
      // Poll Paynow for current transaction status
      const paynowData = await pollTransactionStatus(transaction.pollUrl);

      // Update transaction if status changed
      if (paynowData.status === 'paid' || paynowData.status === 'success') {
        await prisma.transaction.update({
          where: { reference },
          data: {
            status: 'success',
            paidAt: new Date(),
            channel: paynowData.method || 'paynow',
          },
        });

        return NextResponse.json({ 
          success: true, 
          status: 'success',
          data: {
            reference,
            amount: transaction.amount,
            currency: transaction.currency,
            status: 'paid',
            timestamp: new Date().toISOString(),
          }
        });
      } else if (paynowData.status === 'failed') {
        await prisma.transaction.update({
          where: { reference },
          data: { status: 'failed' },
        });

        return NextResponse.json({ 
          success: false, 
          status: 'failed',
          message: 'Payment was declined or failed'
        });
      } else if (paynowData.status === 'cancelled') {
        await prisma.transaction.update({
          where: { reference },
          data: { status: 'cancelled' },
        });

        return NextResponse.json({ 
          success: false, 
          status: 'cancelled',
          message: 'Payment was cancelled'
        });
      }

      // Still pending
      return NextResponse.json({ 
        success: false, 
        status: 'pending',
        message: 'Payment is still processing. Please wait...'
      });
    } catch (pollError: any) {
      console.error('Paynow polling error:', pollError);
      // Return current transaction status from our database if polling fails
      return NextResponse.json({ 
        success: false, 
        status: transaction.status,
        message: 'Unable to poll payment status. Current status: ' + transaction.status
      });
    }
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
