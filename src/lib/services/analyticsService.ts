import { prisma } from "@/lib/prisma";
import { fetchAllPostEngagements, refreshSocialProfile } from "@/lib/social";
import type { Analytics, Platform } from "@/generated/client";

export type DailyMetric = {
  date: string;
  dateLabel: string;
  followers: number;
  reach: number;
  impressions: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  likesDelta: number;
  commentsDelta: number;
  sharesDelta: number;
};

export type PlatformMetric = {
  platform: Platform;
  accountName: string;
  followers: number;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  posts: number;
};

export type PostMetric = {
  postId: string;
  title: string;
  platform: Platform;
  publishedAt: string | null;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayKey(d: Date): string {
  return startOfDay(d).toISOString().slice(0, 10);
}

function fillDayKeys(days: number): string[] {
  const keys: string[] = [];
  const end = startOfDay(new Date());
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    keys.push(dayKey(d));
  }
  return keys;
}

function formatDayLabel(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function calcEngagementRate(
  likes: number,
  comments: number,
  reach: number,
  followers: number
): number {
  const interactions = likes + comments;
  const base = reach > 0 ? reach : followers;
  if (base <= 0) return 0;
  return Number.parseFloat(((interactions / base) * 100).toFixed(2));
}

function buildDailyFromPosts(
  platformPosts: Array<{
    likes: number;
    comments: number;
    shares: number;
    reach: number;
    publishedAt: Date | null;
    post: { publishedAt: Date | null; title: string | null; content: string };
  }>,
  dayKeys: string[]
): Map<string, { likes: number; comments: number; shares: number; reach: number }> {
  const map = new Map<
    string,
    { likes: number; comments: number; shares: number; reach: number }
  >();
  for (const key of dayKeys) {
    map.set(key, { likes: 0, comments: 0, shares: 0, reach: 0 });
  }

  for (const pp of platformPosts) {
    const pub = pp.publishedAt ?? pp.post.publishedAt;
    if (!pub) continue;
    const key = dayKey(pub);
    if (!map.has(key)) continue;
    const cur = map.get(key)!;
    cur.likes += pp.likes ?? 0;
    cur.comments += pp.comments ?? 0;
    cur.shares += pp.shares ?? 0;
    cur.reach += pp.reach ?? 0;
  }

  return map;
}

function mergeDailySeries(
  dayKeys: string[],
  snapshots: Analytics[],
  fromPosts: Map<string, { likes: number; comments: number; shares: number; reach: number }>,
  currentFollowers: number
): DailyMetric[] {
  const snapshotByDay = new Map<string, Analytics>();
  for (const s of snapshots) {
    snapshotByDay.set(dayKey(s.date), s);
  }

  let lastFollowers = currentFollowers;
  const raw: DailyMetric[] = [];

  for (const key of dayKeys) {
    const snap = snapshotByDay.get(key);
    const postDay = fromPosts.get(key);

    const likes = snap?.likes ?? postDay?.likes ?? 0;
    const comments = snap?.comments ?? postDay?.comments ?? 0;
    const shares = snap?.shares ?? postDay?.shares ?? 0;
    const reach = snap?.reach ?? postDay?.reach ?? 0;
    const followers = snap?.followers ?? lastFollowers;
    lastFollowers = followers;

    raw.push({
      date: key,
      dateLabel: formatDayLabel(key),
      followers,
      reach,
      impressions: snap?.impressions ?? 0,
      engagement:
        snap?.engagement ??
        calcEngagementRate(likes, comments, reach, followers),
      likes,
      comments,
      shares,
      likesDelta: 0,
      commentsDelta: 0,
      sharesDelta: 0,
    });
  }

  for (let i = 0; i < raw.length; i++) {
    const prev = i > 0 ? raw[i - 1] : null;
    if (prev && snapshotByDay.has(raw[i].date) && snapshotByDay.has(prev.date)) {
      raw[i].likesDelta = Math.max(0, raw[i].likes - prev.likes);
      raw[i].commentsDelta = Math.max(0, raw[i].comments - prev.comments);
      raw[i].sharesDelta = Math.max(0, raw[i].shares - prev.shares);
    } else {
      raw[i].likesDelta = raw[i].likes;
      raw[i].commentsDelta = raw[i].comments;
      raw[i].sharesDelta = raw[i].shares;
    }
  }

  return raw;
}

async function upsertTodaySnapshot(
  userId: string,
  followers: number,
  likes: number,
  comments: number,
  shares: number,
  reach: number,
  impressions: number
) {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const engagement = calcEngagementRate(likes, comments, reach, followers);

  const existing = await prisma.analytics.findFirst({
    where: { userId, date: { gte: today, lt: tomorrow } },
  });

  const data = {
    followers,
    likes,
    comments,
    shares,
    reach,
    impressions,
    engagement,
  };

  if (existing) {
    await prisma.analytics.update({ where: { id: existing.id }, data });
  } else {
    await prisma.analytics.create({
      data: { userId, date: today, ...data },
    });
  }
}

export async function buildUserAnalytics(userId: string, days: number) {
  const since = new Date(Date.now() - days * 86400000);
  const dayKeys = fillDayKeys(days);

  const accounts = await prisma.socialAccount.findMany({
    where: { userId, isActive: true },
    select: { id: true },
  });

  let refreshError: string | null = null;
  try {
    await Promise.all([
      ...accounts.map((acc) => refreshSocialProfile(acc.id)),
      fetchAllPostEngagements(userId),
    ]);
  } catch (e) {
    refreshError = e instanceof Error ? e.message : "Failed to refresh live data";
    console.error("[analytics] refresh:", e);
  }

  const refreshedAccounts = await prisma.socialAccount.findMany({
    where: { userId },
    select: { platform: true, followers: true, accountName: true },
  });

  const platformPosts = await prisma.platformPost.findMany({
    where: {
      post: { userId, status: "PUBLISHED" },
      OR: [
        { publishedAt: { gte: since } },
        { post: { publishedAt: { gte: since } } },
      ],
    },
    include: {
      post: { select: { title: true, content: true, publishedAt: true } },
    },
  });

  const allPublishedPosts = await prisma.platformPost.findMany({
    where: { post: { userId, status: "PUBLISHED" } },
    include: {
      post: { select: { id: true, title: true, content: true, publishedAt: true } },
    },
  });

  const liveAgg = await prisma.platformPost.aggregate({
    where: { post: { userId } },
    _sum: { likes: true, comments: true, shares: true, reach: true },
    _count: true,
  });

  const likesSum = liveAgg._sum.likes ?? 0;
  const commentsSum = liveAgg._sum.comments ?? 0;
  const sharesSum = liveAgg._sum.shares ?? 0;
  const reachSum = liveAgg._sum.reach ?? 0;
  const totalFollowers = refreshedAccounts.reduce((acc, a) => acc + (a.followers ?? 0), 0);

  await upsertTodaySnapshot(
    userId,
    totalFollowers,
    likesSum,
    commentsSum,
    sharesSum,
    reachSum,
    0
  );

  const snapshots = await prisma.analytics.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  const fromPosts = buildDailyFromPosts(platformPosts, dayKeys);
  const daily = mergeDailySeries(dayKeys, snapshots, fromPosts, totalFollowers);

  const platformMap = new Map<Platform, PlatformMetric>();
  for (const acc of refreshedAccounts) {
    platformMap.set(acc.platform, {
      platform: acc.platform,
      accountName: acc.accountName,
      followers: acc.followers ?? 0,
      likes: 0,
      comments: 0,
      shares: 0,
      reach: 0,
      posts: 0,
    });
  }

  for (const pp of allPublishedPosts) {
    const entry = platformMap.get(pp.platform);
    if (!entry) continue;
    entry.likes += pp.likes ?? 0;
    entry.comments += pp.comments ?? 0;
    entry.shares += pp.shares ?? 0;
    entry.reach += pp.reach ?? 0;
    entry.posts += 1;
  }

  const platforms = Array.from(platformMap.values()).sort(
    (a, b) => b.followers - a.followers
  );

  const topPosts: PostMetric[] = allPublishedPosts
    .map((pp) => ({
      postId: pp.post.id,
      title: (pp.post.title || pp.post.content || "Untitled").slice(0, 80),
      platform: pp.platform,
      publishedAt: (pp.publishedAt ?? pp.post.publishedAt)?.toISOString() ?? null,
      likes: pp.likes ?? 0,
      comments: pp.comments ?? 0,
      shares: pp.shares ?? 0,
      reach: pp.reach ?? 0,
    }))
    .sort((a, b) => b.likes + b.comments - (a.likes + a.comments))
    .slice(0, 20);

  const publishedInRange = await prisma.post.count({
    where: { userId, status: "PUBLISHED", publishedAt: { gte: since } },
  });

  return {
    daily,
    platforms,
    topPosts,
    liveTotals: {
      likes: likesSum,
      comments: commentsSum,
      shares: sharesSum,
      reach: reachSum,
      followers: totalFollowers,
      posts: allPublishedPosts.length,
      publishedInRange,
    },
    refreshError,
    generatedAt: new Date().toISOString(),
    days,
  };
}
