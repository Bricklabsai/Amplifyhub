import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
    }

    // Verify signature
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(body)
      .digest('hex');

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    console.log('Paystack Webhook Event:', event.event);

    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;
      case 'subscription.create':
        await handleSubscriptionCreate(event.data);
        break;
      case 'subscription.disable':
        await handleSubscriptionDisable(event.data);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data);
        break;
      // Add more events as needed
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleChargeSuccess(data: any) {
  const { reference, customer, amount, plan, paid_at, id, channel } = data;

  // Update transaction
  await prisma.transaction.upsert({
    where: { reference },
    update: {
      status: 'success',
      paidAt: new Date(paid_at),
      paystackId: id.toString(),
      channel,
    },
    create: {
      userId: '', // We need to find the user by email if reference doesn't exist yet
      amount: amount / 100,
      reference,
      status: 'success',
      paidAt: new Date(paid_at),
      paystackId: id.toString(),
      channel,
      user: {
        connect: { email: customer.email }
      }
    },
  });

  // If it's a subscription plan
  if (plan) {
    const dbPlan = await prisma.plan.findFirst({
      where: { paystackPlanCode: plan },
    });

    if (dbPlan) {
      await prisma.subscription.upsert({
        where: { userId: (await prisma.user.findUnique({ where: { email: customer.email } }))?.id || '' },
        update: {
          planId: dbPlan.id,
          status: 'ACTIVE',
          paystackCustomerCode: customer.customer_code,
        },
        create: {
          user: { connect: { email: customer.email } },
          plan: { connect: { id: dbPlan.id } },
          status: 'ACTIVE',
          paystackCustomerCode: customer.customer_code,
        },
      });
    }
  }
}

async function handleSubscriptionCreate(data: any) {
  const { customer, plan, subscription_code } = data;
  const dbPlan = await prisma.plan.findFirst({
    where: { paystackPlanCode: plan.plan_code },
  });

  if (dbPlan) {
    await prisma.subscription.upsert({
      where: { userId: (await prisma.user.findUnique({ where: { email: customer.email } }))?.id || '' },
      update: {
        planId: dbPlan.id,
        status: 'ACTIVE',
        paystackSubscriptionCode: subscription_code,
        paystackCustomerCode: customer.customer_code,
      },
      create: {
        user: { connect: { email: customer.email } },
        plan: { connect: { id: dbPlan.id } },
        status: 'ACTIVE',
        paystackSubscriptionCode: subscription_code,
        paystackCustomerCode: customer.customer_code,
      },
    });
  }
}

async function handleSubscriptionDisable(data: any) {
  const { customer, subscription_code } = data;
  const user = await prisma.user.findUnique({ where: { email: customer.email } });
  
  if (user) {
    await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        status: 'CANCELLED',
      },
    });
  }
}

async function handleInvoicePaymentFailed(data: any) {
  const { customer } = data;
  const user = await prisma.user.findUnique({ where: { email: customer.email } });
  
  if (user) {
    await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        status: 'EXPIRED',
      },
    });
  }
}
