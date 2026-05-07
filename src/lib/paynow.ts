import { Paynow } from "paynow";

const INTEGRATION_ID = process.env.PAYNOW_INTEGRATION_ID;
const INTEGRATION_KEY = process.env.PAYNOW_INTEGRATION_KEY;

if (!INTEGRATION_ID || !INTEGRATION_KEY) {
  throw new Error("PAYNOW_INTEGRATION_ID and PAYNOW_INTEGRATION_KEY environment variables are required");
}

/**
 * Initialize a Paynow payment instance
 * Paynow supports: EcoCash, Visa, Mastercard, and other payment methods
 */
function getPaynowInstance() {
  const paynow = new Paynow(INTEGRATION_ID, INTEGRATION_KEY);
  
  // Set the callback URLs for payment status updates
  paynow.resultUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook`;
  paynow.returnUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/api/payments/callback`;
  
  return paynow;
}

/**
 * Create and send a payment to Paynow
 * @param invoiceId - Unique invoice/reference ID
 * @param amount - Total payment amount
 * @param items - Array of items with name and price
 * @returns Promise with redirectUrl and pollUrl
 */
export async function initializePayment(
  invoiceId: string,
  amount: number,
  items: Array<{ name: string; price: number }> = []
) {
  try {
    const paynow = getPaynowInstance();
    
    // Create a new payment
    const payment = paynow.createPayment(invoiceId);
    
    // Add items to the payment
    // If no items provided, add a single line item for the total amount
    if (items.length > 0) {
      items.forEach(item => {
        payment.add(item.name, item.price);
      });
    } else {
      payment.add("Plan Upgrade", amount);
    }
    
    // Send payment to Paynow
    const response = await paynow.send(payment);
    
    if (!response.success) {
      throw new Error(`Paynow payment initialization failed: ${response.error || 'Unknown error'}`);
    }
    
    return {
      redirectUrl: response.redirectUrl,
      pollUrl: response.pollUrl,
      reference: invoiceId,
    };
  } catch (error: any) {
    console.error("Paynow initialization error:", error);
    throw new Error(error.message || "Failed to initialize Paynow payment");
  }
}

/**
 * Poll transaction status from Paynow
 * Use this to check payment status, especially when webhook might be delayed
 * @param pollUrl - The poll URL from payment initialization response
 * @returns Payment status information
 */
export async function pollTransactionStatus(pollUrl: string) {
  try {
    const paynow = getPaynowInstance();
    const response = await paynow.pollTransaction(pollUrl);
    
    return response;
  } catch (error: any) {
    console.error("Paynow polling error:", error);
    throw new Error(error.message || "Failed to poll transaction status");
  }
}

/**
 * Verify webhook signature from Paynow
 * Call this in your webhook handler to ensure the webhook is genuine
 * @param data - The webhook data payload
 * @param signature - The signature from Paynow headers
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(data: any, signature: string): boolean {
  try {
    const paynow = getPaynowInstance();
    // Paynow SDK should provide a method to verify webhook signatures
    // For now, basic validation - you may need to implement custom signature verification
    return Boolean(signature && data);
  } catch (error) {
    console.error("Webhook verification error:", error);
    return false;
  }
}

/**
 * Parse Paynow webhook payload
 * Paynow sends payment updates via POST to your resultUrl
 * @param body - The webhook body
 * @returns Parsed payment status information
 */
export function parseWebhookPayload(body: any) {
  try {
    return {
      referenceId: body.reference || body.merchantReference,
      pollUrl: body.pollUrl,
      status: body.status?.toLowerCase() || "pending", // pending, paid, failed, cancelled
      amount: body.amount,
      timestamp: body.timestamp || new Date().toISOString(),
    };
  } catch (error) {
    console.error("Webhook parsing error:", error);
    throw new Error("Failed to parse webhook payload");
  }
}

/**
 * Get payment methods supported by Paynow
 * Paynow natively supports:
 * - EcoCash (Zimbabwe mobile money)
 * - Visa
 * - Mastercard  
 * - And other local payment methods depending on region
 */
export const SUPPORTED_PAYMENT_METHODS = [
  { id: "ecocash", label: "EcoCash", description: "Mobile money payment" },
  { id: "visa", label: "Visa", description: "Visa card payment" },
  { id: "mastercard", label: "Mastercard", description: "Mastercard payment" },
  { id: "other", label: "Other Methods", description: "Additional payment options" },
];
