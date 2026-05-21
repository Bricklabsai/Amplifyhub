import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchAllPostEngagements, refreshSocialProfile } from "@/lib/social";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const days = Number.parseInt(searchParams.get("days") || "30");

  // Proactively refresh real-time data
  try {
    const accounts = await prisma.socialAccount.findMany({ where: { userId, isActive: true } });
    await Promise.all([
      ...accounts.map(acc => refreshSocialProfile(acc.id)),
      fetchAllPostEngagements(userId)
    ]);

    // Create or update today's analytics snapshot for the graphs
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalFollowers = accounts.reduce((acc, a) => acc + a.followers, 0);
    const liveEngagementSnapshot = await prisma.platformPost.aggregate({
      where: { post: { userId } },
      _sum: { likes: true, comments: true, shares: true, reach: true }
    });

    const likesSum = liveEngagementSnapshot._sum?.likes ?? 0;
    const commentsSum = liveEngagementSnapshot._sum?.comments ?? 0;
    const sharesSum = liveEngagementSnapshot._sum?.shares ?? 0;
    const reachSum = liveEngagementSnapshot._sum?.reach ?? 0;
    const engagementRatio = totalFollowers > 0 ? ((likesSum + commentsSum) / totalFollowers) * 100 : 0;

    await prisma.analytics.upsert({
      where: { 
        // We need a unique constraint or we search by date/userId
        id: (await prisma.analytics.findFirst({ 
          where: { userId, date: { gte: today } } 
        }))?.id || 'new-id-' + Math.random() 
      },
      create: {
        userId,
        date: today,
        followers: totalFollowers,
        likes: likesSum,
        comments: commentsSum,
        shares: sharesSum,
        reach: reachSum,
        engagement: engagementRatio,
      },
      update: {
        followers: totalFollowers,
        likes: likesSum,
        comments: commentsSum,
        shares: sharesSum,
        reach: reachSum,
        engagement: engagementRatio,
      }
    });
  } catch (e) {
    console.error("Failed to refresh real-time analytics:", e);
  }

  const since = new Date(Date.now() - days * 86400000);
  const analytics = await prisma.analytics.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  const platforms = await prisma.socialAccount.findMany({
    where: { userId },
    select: { platform: true, followers: true, accountName: true },
  });

  // Calculate live totals for the KPI cards
  const liveEngagement = await prisma.platformPost.aggregate({
    where: { post: { userId } },
    _sum: {
      likes: true,
      comments: true,
      shares: true,
      reach: true,
    }
  });

  return NextResponse.json({ 
    analytics, 
    platforms,
    liveTotals: {
      likes: liveEngagement._sum?.likes || 0,
      comments: liveEngagement._sum?.comments || 0,
      shares: liveEngagement._sum?.shares || 0,
      reach: liveEngagement._sum?.reach || 0,
    }
  });
}
