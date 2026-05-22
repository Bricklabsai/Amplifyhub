import { prisma } from "./prisma";
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefs,
} from "./notification-prefs";

export type NotificationType = "success" | "warning" | "error" | "info";
export type NotificationPrefKey = keyof NotificationPrefs;

export async function getUserNotificationPrefs(
  userId: string
): Promise<NotificationPrefs> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });
  const stored = (user?.settings as Record<string, unknown> | null) ?? {};
  return {
    ...DEFAULT_NOTIFICATION_PREFS,
    ...(stored.notifications as Partial<NotificationPrefs> | undefined),
  };
}

function truncate(text: string, max = 60): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export async function createUserNotification(params: {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  prefKey?: NotificationPrefKey;
  dedupeKey?: string;
  dedupeHours?: number;
}): Promise<boolean> {
  const {
    userId,
    title,
    message,
    type = "info",
    link,
    prefKey,
    dedupeKey,
    dedupeHours = 24,
  } = params;

  if (prefKey) {
    const prefs = await getUserNotificationPrefs(userId);
    if (!prefs[prefKey]) return false;
  }

  if (dedupeKey) {
    const since = new Date(Date.now() - dedupeHours * 60 * 60 * 1000);
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        link: dedupeKey,
        createdAt: { gte: since },
      },
    });
    if (existing) return false;
  }

  await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      link: dedupeKey ?? link ?? null,
    },
  });
  return true;
}

export async function notifyPostPublished(params: {
  userId: string;
  postId: string;
  postLabel: string;
  scheduled?: boolean;
  partial?: boolean;
  failed?: boolean;
  successCount?: number;
  totalCount?: number;
  errorDetail?: string;
}): Promise<void> {
  const {
    userId,
    postId,
    postLabel,
    scheduled = false,
    partial = false,
    failed = false,
    successCount = 0,
    totalCount = 0,
    errorDetail,
  } = params;

  const label = truncate(postLabel);

  if (failed) {
    await createUserNotification({
      userId,
      prefKey: "post_published",
      title: scheduled ? "Scheduled post failed" : "Post failed to publish",
      message:
        errorDetail ||
        `Could not publish "${label}". Check your accounts and media, then try again.`,
      type: "error",
      link: `/posts/${postId}`,
      dedupeKey: `dedupe:publish-fail:${postId}`,
      dedupeHours: 12,
    });
    return;
  }

  if (partial) {
    await createUserNotification({
      userId,
      prefKey: "post_published",
      title: scheduled ? "Scheduled post partially published" : "Post partially published",
      message: `"${label}" went live on ${successCount} of ${totalCount} account(s).`,
      type: "warning",
      link: `/posts/${postId}`,
      dedupeKey: `dedupe:publish-partial:${postId}`,
      dedupeHours: 12,
    });
    return;
  }

  await createUserNotification({
    userId,
    prefKey: "post_published",
    title: scheduled ? "Scheduled post published" : "Post published",
    message: scheduled
      ? `Your scheduled post "${label}" is now live on ${successCount || totalCount || "your"} account(s).`
      : `"${label}" was published successfully.`,
    type: "success",
    link: `/posts/${postId}`,
    dedupeKey: `dedupe:publish-success:${postId}`,
    dedupeHours: 12,
  });
}

export async function notifyPostEngagement(params: {
  userId: string;
  postId: string;
  postLabel: string;
  prevLikes: number;
  prevComments: number;
  newLikes: number;
  newComments: number;
}): Promise<boolean> {
  const { userId, postId, postLabel, prevLikes, prevComments, newLikes, newComments } =
    params;
  const likeDelta = Math.max(0, newLikes - prevLikes);
  const commentDelta = Math.max(0, newComments - prevComments);
  if (likeDelta === 0 && commentDelta === 0) return false;

  const parts: string[] = [];
  if (likeDelta > 0) {
    parts.push(`${likeDelta} new like${likeDelta === 1 ? "" : "s"}`);
  }
  if (commentDelta > 0) {
    parts.push(`${commentDelta} new comment${commentDelta === 1 ? "" : "s"}`);
  }

  return createUserNotification({
    userId,
    prefKey: "post_engagement",
    title: "New engagement on your post",
    message: `${parts.join(" and ")} on "${truncate(postLabel)}".`,
    type: "info",
    link: `/posts/${postId}`,
    dedupeKey: `dedupe:engagement:${postId}`,
    dedupeHours: 6,
  });
}

export async function notifyPaymentSuccess(params: {
  userId: string;
  amount: number;
  currency?: string;
  reference: string;
}): Promise<void> {
  const { userId, amount, currency = "USD", reference } = params;
  await createUserNotification({
    userId,
    prefKey: "billing",
    title: "Payment received",
    message: `Your payment of ${currency} ${amount.toFixed(2)} was successful.`,
    type: "success",
    link: "/billing",
    dedupeKey: `dedupe:payment-success:${reference}`,
    dedupeHours: 72,
  });
}

export async function notifyPaymentFailed(params: {
  userId: string;
  reference: string;
  reason?: string;
}): Promise<void> {
  const { userId, reference, reason } = params;
  await createUserNotification({
    userId,
    prefKey: "billing",
    title: "Payment failed",
    message:
      reason ||
      "Your payment could not be completed. Open Billing to try again.",
    type: "error",
    link: "/billing",
    dedupeKey: `dedupe:payment-fail:${reference}`,
    dedupeHours: 24,
  });
}

export async function notifyCampaignStarted(params: {
  userId: string;
  campaignId: string;
  campaignName: string;
  recipientCount: number;
}): Promise<void> {
  const { userId, campaignId, campaignName, recipientCount } = params;
  await createUserNotification({
    userId,
    prefKey: "campaign_started",
    title: "Email campaign sent",
    message: `"${truncate(campaignName)}" was sent to ${recipientCount} recipient${recipientCount === 1 ? "" : "s"}.`,
    type: "success",
    link: "/email-hub",
    dedupeKey: `dedupe:campaign-sent:${campaignId}`,
    dedupeHours: 24,
  });
}

type UsageFeature = "posts" | "aiText" | "aiImage";

const FEATURE_LABELS: Record<UsageFeature, string> = {
  posts: "Monthly posts",
  aiText: "AI text generations",
  aiImage: "AI image generations",
};

export async function notifyUsageThresholds(userId: string): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: {
      plan: {
        select: {
          postsPerMonth: true,
          aiTextLimit: true,
          aiImageLimit: true,
        },
      },
    },
  });
  if (!subscription?.plan) return;

  const checks: { feature: UsageFeature; used: number; limit: number }[] = [
    { feature: "posts", used: subscription.postsUsed, limit: subscription.plan.postsPerMonth },
    { feature: "aiText", used: subscription.aiTextUsed, limit: subscription.plan.aiTextLimit },
    { feature: "aiImage", used: subscription.aiImageUsed, limit: subscription.plan.aiImageLimit },
  ];

  for (const { feature, used, limit } of checks) {
    if (limit <= 0) continue;
    const label = FEATURE_LABELS[feature];
    const pct = used / limit;

    if (used >= limit) {
      await createUserNotification({
        userId,
        prefKey: "ai_credits_low",
        title: `${label} limit reached`,
        message: `You've used all ${limit} ${label.toLowerCase()} on your plan. Upgrade in Billing to continue.`,
        type: "error",
        link: "/billing",
        dedupeKey: `dedupe:usage:${feature}:100`,
        dedupeHours: 168,
      });
    } else if (pct >= 0.9) {
      const remaining = limit - used;
      await createUserNotification({
        userId,
        prefKey: "ai_credits_low",
        title: `${label} almost used up`,
        message: `Only ${remaining} remaining (${Math.round(pct * 100)}% used). Consider upgrading your plan.`,
        type: "warning",
        link: "/billing",
        dedupeKey: `dedupe:usage:${feature}:90`,
        dedupeHours: 168,
      });
    } else if (pct >= 0.8) {
      const remaining = limit - used;
      await createUserNotification({
        userId,
        prefKey: "ai_credits_low",
        title: `${label} running low`,
        message: `${remaining} remaining (${Math.round(pct * 100)}% of your monthly limit used).`,
        type: "warning",
        link: "/billing",
        dedupeKey: `dedupe:usage:${feature}:80`,
        dedupeHours: 168,
      });
    }
  }
}
