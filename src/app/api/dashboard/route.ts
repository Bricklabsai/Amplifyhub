import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPaidPlan } from "@/lib/subscription";
import { listInboxConversations } from "@/lib/zernio-inbox";

const PROCESSING_LOCK = "processing";

function postPreview(post: {
  id: string;
  content: string;
  status: string;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: post.id,
    content: post.content.slice(0, 120),
    status: post.status,
    scheduledAt: post.scheduledAt,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
  };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  const scheduledFutureWhere = {
    userId,
    status: "SCHEDULED" as const,
    OR: [{ scheduledAt: { gt: now } }, { scheduledAt: null }],
    NOT: { scheduleSource: PROCESSING_LOCK },
  };

  const queuedWhere = {
    userId,
    status: "SCHEDULED" as const,
    OR: [
      { scheduleSource: PROCESSING_LOCK },
      { scheduledAt: { lte: now } },
    ],
  };

  const [
    totalPosts,
    publishedCount,
    scheduledCount,
    draftCount,
    queuedCount,
    failedCount,
    socialAccounts,
    recentPublished,
    recentScheduled,
    recentDrafts,
    recentQueued,
    notifications,
    unreadNotifications,
    calendarPosts,
    subscription,
    engagementAgg,
    user,
    zernioAccounts,
  ] = await Promise.all([
    prisma.post.count({ where: { userId } }),
    prisma.post.count({ where: { userId, status: "PUBLISHED" } }),
    prisma.post.count({ where: scheduledFutureWhere }),
    prisma.post.count({ where: { userId, status: "DRAFT" } }),
    prisma.post.count({ where: queuedWhere }),
    prisma.post.count({ where: { userId, status: "FAILED" } }),
    prisma.socialAccount.count({ where: { userId, isActive: true } }),
    prisma.post.findMany({
      where: { userId, status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { id: true, content: true, status: true, scheduledAt: true, publishedAt: true, createdAt: true },
    }),
    prisma.post.findMany({
      where: scheduledFutureWhere,
      orderBy: { scheduledAt: "asc" },
      take: 3,
      select: { id: true, content: true, status: true, scheduledAt: true, publishedAt: true, createdAt: true },
    }),
    prisma.post.findMany({
      where: { userId, status: "DRAFT" },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: { id: true, content: true, status: true, scheduledAt: true, publishedAt: true, createdAt: true },
    }),
    prisma.post.findMany({
      where: queuedWhere,
      orderBy: { scheduledAt: "asc" },
      take: 3,
      select: { id: true, content: true, status: true, scheduledAt: true, publishedAt: true, createdAt: true },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.notification.count({ where: { userId, read: false } }),
    prisma.post.findMany({
      where: {
        userId,
        status: { in: ["PUBLISHED", "SCHEDULED", "DRAFT"] },
      },
      select: {
        id: true,
        content: true,
        status: true,
        scheduledAt: true,
        publishedAt: true,
        createdAt: true,
        scheduleSource: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    }),
    prisma.platformPost.aggregate({
      where: { post: { userId, status: "PUBLISHED" } },
      _sum: { likes: true, comments: true, shares: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { zernioProfileId: true },
    }),
    prisma.socialAccount.findMany({
      where: { userId, isActive: true, zernioAccountId: { not: null } },
      select: { zernioAccountId: true, accountName: true, platform: true },
    }),
  ]);

  const totalFollowers = await prisma.socialAccount.aggregate({
    where: { userId },
    _sum: { followers: true },
  });

  let inboxPreview: {
    id: string;
    participantName?: string;
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount?: number;
  }[] = [];
  let unreadMessages = 0;

  if (isPaidPlan(subscription?.plan)) {
    try {
      const { conversations } = await listInboxConversations({
        profileId: user?.zernioProfileId || undefined,
      });
      inboxPreview = conversations.slice(0, 3).map((c) => ({
        id: c.id,
        participantName: c.participantName || c.participantUsername,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt,
        unreadCount: c.unreadCount,
      }));
      unreadMessages = conversations.reduce((s, c) => s + (c.unreadCount ?? 0), 0);
    } catch {
      inboxPreview = [];
    }
  }

  const calendarEvents = calendarPosts
    .map((post) => {
      const isQueued =
        post.status === "SCHEDULED" &&
        (post.scheduleSource === PROCESSING_LOCK ||
          (post.scheduledAt && post.scheduledAt <= now));

      let eventDate: Date;
      let displayStatus: string;

      if (post.status === "PUBLISHED" && post.publishedAt) {
        eventDate = post.publishedAt;
        displayStatus = "PUBLISHED";
      } else if (isQueued) {
        eventDate = post.scheduledAt || post.createdAt;
        displayStatus = "QUEUED";
      } else if (post.status === "SCHEDULED" && post.scheduledAt) {
        eventDate = post.scheduledAt;
        displayStatus = "SCHEDULED";
      } else if (post.status === "DRAFT") {
        eventDate = post.createdAt;
        displayStatus = "DRAFT";
      } else {
        return null;
      }

      const content = post.content.trim();
      const firstStatement =
        content.match(/^[^\n.!?]+[.!?]?/)?.[0]?.trim() ||
        content.split("\n")[0]?.trim() ||
        content.slice(0, 80) ||
        "Untitled post";

      return {
        id: post.id,
        title: firstStatement.slice(0, 80),
        excerpt: firstStatement.length > 80 ? `${firstStatement.slice(0, 77)}…` : firstStatement,
        content,
        date: eventDate.toISOString(),
        status: displayStatus,
      };
    })
    .filter(Boolean);

  const [recentEngagementPosts, totalNotifications] = await Promise.all([
    prisma.post.findMany({
      where: { userId, status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 3,
      include: {
        platformPosts: {
          select: { likes: true, comments: true, shares: true, platform: true },
        },
      },
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  return NextResponse.json({
    stats: {
      totalPosts,
      publishedCount,
      scheduledPosts: scheduledCount,
      draftCount,
      queuedCount,
      failedCount,
      socialAccounts,
      totalFollowers: totalFollowers._sum.followers || 0,
    },
    subscription: {
      isPaid: isPaidPlan(subscription?.plan),
      planName: subscription?.plan?.name ?? "Basic",
      planPrice: subscription?.plan?.price ?? 0,
    },
    activities: {
      published: {
        count: publishedCount,
        preview: recentPublished.map(postPreview),
        href: "/posts?status=PUBLISHED",
      },
      scheduled: {
        count: scheduledCount,
        preview: recentScheduled.map(postPreview),
        href: "/posts?status=SCHEDULED",
      },
      drafts: {
        count: draftCount,
        preview: recentDrafts.map(postPreview),
        href: "/posts?status=DRAFT",
      },
      queued: {
        count: queuedCount,
        preview: recentQueued.map(postPreview),
        href: "/posts?status=queued",
      },
      notifications: {
        count: unreadNotifications,
        total: totalNotifications,
        preview: notifications,
        href: "/posts/notifications",
      },
      engagements: {
        likes: engagementAgg._sum.likes ?? 0,
        comments: engagementAgg._sum.comments ?? 0,
        shares: engagementAgg._sum.shares ?? 0,
        preview: recentEngagementPosts.map((p) => ({
          id: p.id,
          content: p.content.slice(0, 80),
          likes: p.platformPosts.reduce((s, pp) => s + pp.likes, 0),
          comments: p.platformPosts.reduce((s, pp) => s + pp.comments, 0),
          shares: p.platformPosts.reduce((s, pp) => s + pp.shares, 0),
        })),
        href: "/posts/engagements",
      },
      messages: {
        count: unreadMessages,
        preview: inboxPreview,
        href: "/posts/messages",
        requiresPaid: true,
      },
    },
    calendarEvents,
    zernioConnected: zernioAccounts.length > 0,
  });
}
