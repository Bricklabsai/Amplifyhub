import { prisma } from '@/lib/prisma';
import { pollTransactionStatus } from '@/lib/paynow';

/**
 * Configuration for payment polling behavior
 */
export const POLLING_CONFIG = {
  // Maximum number of polling attempts before giving up
  MAX_ATTEMPTS: 30,
  // Initial delay in milliseconds (will increase with exponential backoff)
  INITIAL_DELAY: 2000,
  // Maximum delay between polls in milliseconds
  MAX_DELAY: 30000,
  // Backoff multiplier for exponential backoff
  BACKOFF_MULTIPLIER: 1.5,
};

/**
 * Poll a Paynow transaction until it completes or times out
 * Uses exponential backoff to reduce server load
 * @param reference - Transaction reference ID
 * @param maxAttempts - Maximum polling attempts (default: POLLING_CONFIG.MAX_ATTEMPTS)
 * @returns Promise with final transaction status
 */
export async function pollPaymentStatus(
  reference: string,
  maxAttempts = POLLING_CONFIG.MAX_ATTEMPTS
) {
  const transaction = await prisma.transaction.findUnique({
    where: { reference },
  });

  if (!transaction) {
    throw new Error(`Transaction not found: ${reference}`);
  }

  if (!transaction.pollUrl) {
    throw new Error(`No poll URL found for transaction: ${reference}`);
  }

  let attempts = 0;
  let delay = POLLING_CONFIG.INITIAL_DELAY;

  while (attempts < maxAttempts) {
    try {
      // Wait before polling
      await new Promise(resolve => setTimeout(resolve, delay));

      // Poll Paynow for status
      const response = await pollTransactionStatus(transaction.pollUrl);

      // Update transaction with latest status
      const updatedTransaction = await prisma.transaction.update({
        where: { reference },
        data: {
          status: mapPaynowStatus(response.status),
          channel: response.method || transaction.channel,
          paidAt: response.status === 'paid' ? new Date() : transaction.paidAt,
        },
      });

      // If payment is complete (success or failure), return immediately
      if (response.status === 'paid' || response.status === 'success') {
        console.log(`[Polling] Payment successful after ${attempts + 1} attempts: ${reference}`);
        return { status: 'success', transaction: updatedTransaction };
      } else if (response.status === 'failed' || response.status === 'cancelled') {
        console.log(`[Polling] Payment ${response.status}: ${reference}`);
        return { status: response.status, transaction: updatedTransaction };
      }

      // Still pending, continue polling with exponential backoff
      attempts++;
      delay = Math.min(delay * POLLING_CONFIG.BACKOFF_MULTIPLIER, POLLING_CONFIG.MAX_DELAY);
      console.log(`[Polling] Attempt ${attempts}/${maxAttempts}, next in ${delay}ms: ${reference}`);

    } catch (error: any) {
      console.error(`[Polling] Error on attempt ${attempts + 1}: ${error.message}`);
      attempts++;

      // Continue polling even if there's an error, with increased delay
      if (attempts < maxAttempts) {
        delay = Math.min(delay * POLLING_CONFIG.BACKOFF_MULTIPLIER, POLLING_CONFIG.MAX_DELAY);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause before retry
      }
    }
  }

  // Max attempts reached
  console.warn(`[Polling] Max polling attempts (${maxAttempts}) reached: ${reference}`);
  return {
    status: 'timeout',
    transaction,
    message: 'Payment verification timed out. Please check back later or contact support.',
  };
}

/**
 * Map Paynow status values to our transaction status values
 */
function mapPaynowStatus(paynowStatus: string): string {
  const statusMap: Record<string, string> = {
    paid: 'success',
    success: 'success',
    failed: 'failed',
    error: 'failed',
    cancelled: 'cancelled',
    pending: 'pending',
    processing: 'pending',
  };

  return statusMap[paynowStatus.toLowerCase()] || 'pending';
}

/**
 * Poll all pending transactions (useful for background job/cron)
 * Returns transactions that were updated
 */
export async function pollPendingTransactions() {
  const pendingTransactions = await prisma.transaction.findMany({
    where: {
      status: 'pending',
      pollUrl: { not: null },
    },
    orderBy: { createdAt: 'asc' },
    take: 10, // Process in batches to avoid overload
  });

  const results = [];

  for (const transaction of pendingTransactions) {
    try {
      if (!transaction.pollUrl) continue;

      const response = await pollTransactionStatus(transaction.pollUrl);
      const newStatus = mapPaynowStatus(response.status);

      // Only update if status has changed
      if (newStatus !== 'pending') {
        const updated = await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: newStatus,
            channel: response.method || transaction.channel,
            paidAt: newStatus === 'success' ? new Date() : transaction.paidAt,
          },
        });

        // Handle subscription updates if payment succeeded
        if (newStatus === 'success') {
          const subscription = await prisma.subscription.findUnique({
            where: { userId: transaction.userId },
          });

          if (subscription) {
            await prisma.subscription.update({
              where: { userId: transaction.userId },
              data: {
                status: 'ACTIVE',
                paynowPaymentId: transaction.reference,
                startDate: new Date(),
                postsUsed: 0,
                aiTextUsed: 0,
                aiImageUsed: 0,
                lastResetAt: new Date(),
              },
            });
          }
        }

        results.push({
          reference: transaction.reference,
          previousStatus: transaction.status,
          newStatus,
          updated: true,
        });
      }
    } catch (error: any) {
      console.error(`Error polling transaction ${transaction.reference}: ${error.message}`);
      results.push({
        reference: transaction.reference,
        error: error.message,
        updated: false,
      });
    }
  }

  return results;
}

/**
 * Clean up old pending transactions (older than 24 hours)
 * These likely failed or were abandoned
 */
export async function cleanupStaleTransactions(ageHours = 24) {
  const cutoffTime = new Date(Date.now() - ageHours * 60 * 60 * 1000);

  const deleted = await prisma.transaction.deleteMany({
    where: {
      status: 'pending',
      createdAt: { lt: cutoffTime },
    },
  });

  console.log(`[Cleanup] Deleted ${deleted.count} stale pending transactions older than ${ageHours} hours`);
  return deleted.count;
}
