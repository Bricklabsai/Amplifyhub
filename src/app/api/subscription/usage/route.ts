import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Calculate remaining usage
    const remaining = {
      posts: Math.max(0, subscription.plan.postsPerMonth - subscription.postsUsed),
      aiText: Math.max(0, subscription.plan.aiTextLimit - subscription.aiTextUsed),
      aiImage: Math.max(0, subscription.plan.aiImageLimit - subscription.aiImageUsed),
    };

    const percentages = {
      posts: subscription.plan.postsPerMonth > 0 
        ? Math.round((subscription.postsUsed / subscription.plan.postsPerMonth) * 100) 
        : 0,
      aiText: subscription.plan.aiTextLimit > 0 
        ? Math.round((subscription.aiTextUsed / subscription.plan.aiTextLimit) * 100) 
        : 0,
      aiImage: subscription.plan.aiImageLimit > 0 
        ? Math.round((subscription.aiImageUsed / subscription.plan.aiImageLimit) * 100) 
        : 0,
    };

    return NextResponse.json({
      plan: subscription.plan,
      usage: {
        posts: subscription.postsUsed,
        aiText: subscription.aiTextUsed,
        aiImage: subscription.aiImageUsed,
      },
      remaining,
      percentages,
      limits: {
        posts: subscription.plan.postsPerMonth,
        aiText: subscription.plan.aiTextLimit,
        aiImage: subscription.plan.aiImageLimit,
      },
    });
  } catch (error: any) {
    console.error('Error fetching usage:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
