import { prisma } from "./prisma";

export type Feature = "posts" | "aiText" | "aiImage";

export async function checkAndIncrementUsage(userId: string, feature: Feature) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });

  if (!subscription) {
    // If no subscription, try to give them a basic plan if they exist
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    
    // Auto-create basic subscription if missing
    const basicPlan = await prisma.plan.findUnique({ where: { name: "Basic" } });
    if (basicPlan) {
      const newSub = await prisma.subscription.create({
        data: {
          userId,
          planId: basicPlan.id,
          status: "ACTIVE",
        },
        include: { plan: true },
      });
      return await performCheck(newSub, feature, userId);
    }
    throw new Error("No subscription or basic plan found");
  }

  // Check for reset (monthly)
  const now = new Date();
  const lastReset = new Date(subscription.lastResetAt);
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

  if (now.getTime() - lastReset.getTime() >= thirtyDaysInMs) {
    // Reset usage
    const updatedSub = await prisma.subscription.update({
      where: { userId },
      data: {
        postsUsed: 0,
        aiTextUsed: 0,
        aiImageUsed: 0,
        lastResetAt: now,
      },
      include: { plan: true },
    });
    return await performCheck(updatedSub, feature, userId);
  }

  return await performCheck(subscription, feature, userId);
}

async function performCheck(subscription: any, feature: Feature, userId: string) {
  const { plan } = subscription;

  if (feature === "posts") {
    if (subscription.postsUsed >= plan.postsPerMonth) {
      return { allowed: false, limit: plan.postsPerMonth, current: subscription.postsUsed };
    }
    await prisma.subscription.update({
      where: { userId },
      data: { postsUsed: { increment: 1 } },
    });
  } else if (feature === "aiText") {
    if (subscription.aiTextUsed >= plan.aiTextLimit) {
      return { allowed: false, limit: plan.aiTextLimit, current: subscription.aiTextUsed };
    }
    await prisma.subscription.update({
      where: { userId },
      data: { aiTextUsed: { increment: 1 } },
    });
  } else if (feature === "aiImage") {
    if (subscription.aiImageUsed >= plan.aiImageLimit) {
      return { allowed: false, limit: plan.aiImageLimit, current: subscription.aiImageUsed };
    }
    await prisma.subscription.update({
      where: { userId },
      data: { aiImageUsed: { increment: 1 } },
    });
  }

  return { allowed: true };
}
