# Paynow Integration Guide

## Overview
AmplifyHub has been migrated from Paystack to Paynow for payment processing. Paynow is specifically designed for the Zimbabwe market and supports multiple payment methods including EcoCash, Visa, and Mastercard.

## Environment Variables

### Paynow Configuration
```env
# Paynow Integration Credentials (from Paynow Dashboard)
PAYNOW_INTEGRATION_ID=your_integration_id
PAYNOW_INTEGRATION_KEY=your_integration_key
```

### Removed Variables (Paystack)
The following Paystack environment variables are **no longer needed** and can be removed from your `.env` file:
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PRO_PLAN_CODE` (no longer used - Paynow doesn't require plan codes)
- `PAYSTACK_CORPORATE_PLAN_CODE` (no longer used)

## Key Changes from Paystack to Paynow

### 1. **Payment Flow**
- **Paystack**: Reference-based verification after redirect
- **Paynow**: Poll URL-based status checking with polling mechanism

### 2. **Database Schema Changes**

#### Plan Model
- Removed: `paystackPlanCode`
- Added: `paynowPaymentId` (optional, for payment tracking)

#### Subscription Model
- Removed: `paystackSubscriptionCode`, `paystackCustomerCode`
- Added: `paynowPaymentId` (Paynow transaction reference)
- Note: Paynow doesn't have native recurring subscriptions, so manual handling is implemented

#### Transaction Model
- Removed: `paystackId`
- Changed: `currency` default from `"USD"` to `"ZWL"` (Zimbabwe Rand)
- Added: `pollUrl` (critical for Paynow status polling)
- Kept: `reference` (now used as Paynow `merchantReference`)

### 3. **Payment Methods**
Paynow supports the following payment methods out of the box:
- **EcoCash** - Zimbabwe mobile money (primary method)
- **Visa** - Visa card payments
- **Mastercard** - Mastercard payments
- **Other regional methods** - Varies by Paynow integration setup

## API Endpoints

### POST `/api/payments/initialize`
**Initiates a Paynow payment**

Request:
```json
{
  "planId": "plan-id-here"
}
```

Response:
```json
{
  "success": true,
  "redirectUrl": "https://paynow.co.zw/...",
  "pollUrl": "https://paynow.co.zw/api/initiatetransaction.json?...",
  "reference": "AH-user-timestamp-random"
}
```

**Flow:**
1. User selects plan and clicks "Upgrade"
2. Frontend calls `/api/payments/initialize` with `planId`
3. Backend creates Paynow payment with `paynow.send(payment)`
4. Returns `redirectUrl` (user is redirected to Paynow payment page)
5. Stores transaction with `pollUrl` for status checking

### GET `/api/payments/callback`
**Handles return from Paynow payment page**

Query Parameters:
- `reference` - The payment reference (same as sent to Paynow)
- `merchantReference` - Alternative parameter name from Paynow

**Flow:**
1. User completes or cancels payment at Paynow
2. Redirected back to `/api/payments/callback?reference=...`
3. Endpoint polls Paynow using stored `pollUrl` to get status
4. Updates transaction and subscription if successful
5. Redirects to `/dashboard/billing?payment=success|pending|failed`

### POST `/api/payments/webhook`
**Receives payment status updates from Paynow**

**Payload Format:**
```json
{
  "reference": "AH-user-timestamp-random",
  "status": "paid|failed|cancelled|pending",
  "amount": 29.99,
  "method": "ecocash|visa|mastercard",
  "timestamp": "2024-12-20T10:30:00Z"
}
```

**Webhook Events:**
- `paid` / `success` - Payment completed successfully
- `failed` - Payment declined or failed
- `cancelled` - User cancelled the payment
- `pending` - Payment is still processing

### GET `/api/payments/verify?reference=...`
**Check payment status manually**

Response Examples:

**Success:**
```json
{
  "success": true,
  "status": "success",
  "data": {
    "reference": "AH-...",
    "amount": 29.99,
    "currency": "ZWL",
    "status": "paid",
    "timestamp": "2024-12-20T10:30:00Z"
  }
}
```

**Pending:**
```json
{
  "success": false,
  "status": "pending",
  "message": "Payment is still processing. Please wait..."
}
```

**Failed:**
```json
{
  "success": false,
  "status": "failed",
  "message": "Payment was declined or failed"
}
```

## Paynow Integration Library

### Core Functions

#### `initializePayment(invoiceId, amount, items?)`
Creates and sends a payment to Paynow.

```typescript
import { initializePayment } from '@/lib/paynow';

const response = await initializePayment('AH-123456', 29.99, [
  { name: 'Pro Plan - Monthly', price: 29.99 }
]);
// Returns: { redirectUrl, pollUrl, reference }
```

#### `pollTransactionStatus(pollUrl)`
Checks payment status with Paynow using the polling URL.

```typescript
import { pollTransactionStatus } from '@/lib/paynow';

const status = await pollTransactionStatus(pollUrl);
// Returns: { status: 'paid|failed|cancelled|pending', method, ... }
```

#### `parseWebhookPayload(body)`
Parses incoming Paynow webhook notifications.

```typescript
import { parseWebhookPayload } from '@/lib/paynow';

const data = parseWebhookPayload(webhookBody);
// Returns: { referenceId, pollUrl, status, amount, timestamp }
```

### Polling Utilities

#### `pollPaymentStatus(reference, maxAttempts?)`
Continuously polls a transaction until completion or timeout.

```typescript
import { pollPaymentStatus } from '@/lib/paynow-polling';

const result = await pollPaymentStatus('AH-123456');
// Returns: { status: 'success|failed|cancelled|timeout', transaction }
```

**Features:**
- Exponential backoff to reduce load
- Maximum 30 polling attempts (configurable)
- Initial delay: 2 seconds, max delay: 30 seconds
- Automatic status updates in database

#### `pollPendingTransactions()`
Background job to poll all pending transactions.

```typescript
import { pollPendingTransactions } from '@/lib/paynow-polling';

const results = await pollPendingTransactions();
// Returns: Array of updated transactions
```

**Recommended:** Run via cron job every 1-5 minutes to catch pending transactions.

#### `cleanupStaleTransactions(ageHours?)`
Removes old pending transactions (default: 24+ hours).

```typescript
import { cleanupStaleTransactions } from '@/lib/paynow-polling';

const deleted = await cleanupStaleTransactions(24);
// Returns: Count of deleted transactions
```

**Recommended:** Run daily via cron job to clean up abandoned transactions.

## Migration Steps Completed

✅ Created `/src/lib/paynow.ts` - Core Paynow integration  
✅ Created `/src/lib/paynow-polling.ts` - Payment polling utilities  
✅ Updated Prisma schema (Plan, Subscription, Transaction models)  
✅ Updated `/api/payments/initialize` endpoint  
✅ Updated `/api/payments/callback` endpoint  
✅ Updated `/api/payments/webhook` endpoint  
✅ Updated `/api/payments/verify` endpoint  
✅ Updated billing component (UpgradeModal)  
✅ Removed Paystack dependencies from seed  

## Outstanding Tasks

⚠️ **Database Migration**
Run Prisma migration to apply schema changes:
```bash
npx prisma migrate dev --name paystack_to_paynow
```

⚠️ **Data Migration** (if you have existing Paystack transactions)
You may want to preserve historical data. Consider:
1. Creating a backup of existing transactions
2. Clearing pending transactions older than 24 hours
3. Marking completed Paystack transactions as "archived"

## Testing

### Manual Testing Steps

1. **Environment Setup:**
   ```bash
   PAYNOW_INTEGRATION_ID=test_integration_id
   PAYNOW_INTEGRATION_KEY=test_integration_key
   ```

2. **Test Payment Flow:**
   - Go to `/dashboard/billing`
   - Click "Upgrade" on a paid plan
   - Redirect to Paynow test gateway
   - Complete test payment (use test credentials)
   - Verify callback and subscription update

3. **Test Polling:**
   - Create a payment transaction
   - Call `/api/payments/verify?reference=...` multiple times
   - Status should update from pending → success

4. **Test Webhook:**
   - Use Postman or webhook.site to send test webhook
   - Verify transaction and subscription update

### Test Payment Methods
Paynow provides test credentials for development:
- **EcoCash Test:** Use account numbers like `0771234567`
- **Visa Test:** Use standard test card numbers
- Check Paynow documentation for current test credentials

## Troubleshooting

### Common Issues

**"Invalid Paynow credentials"**
- Verify `PAYNOW_INTEGRATION_ID` and `PAYNOW_INTEGRATION_KEY` in `.env`
- Ensure credentials are copied exactly from Paynow dashboard
- Check that environment variables are loaded before app starts

**"No poll URL found"**
- Ensure transaction was created with `pollUrl` in database
- Check that Paynow response included `pollUrl` in initialization
- Verify webhook is being received (check logs)

**"Payment status stuck on pending"**
- Run `pollPendingTransactions()` to manually check status
- Check Paynow logs for webhook delivery issues
- Verify webhook endpoint is accessible from Paynow servers

**"Currency mismatch (USD vs ZWL)"**
- All new transactions default to ZWL (Zimbabwe currency)
- Old Paystack transactions may have stored "USD"
- Update plan pricing if needed to reflect ZWL amounts

## Support & Documentation

- **Paynow API Docs:** https://developer.paynow.co.zw/
- **Paynow Dashboard:** https://dashboard.paynow.co.zw/
- **Integration Examples:** Check Paynow Node.js SDK documentation
- **Webhook Documentation:** Paynow webhook format and signature verification

## Rollback Plan

If you need to revert to Paystack:

1. Restore old `/src/lib/paystack.ts` file
2. Revert Prisma schema changes
3. Update payment endpoints back to Paystack functions
4. Restore `PAYSTACK_SECRET_KEY` environment variable
5. Run `npx prisma migrate reset` (or manual rollback migration)

However, **we recommend proceeding with Paynow** as it's the better choice for Zimbabwe-based operations.
