import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      engagementByPlatform,
      emailCampaignMetrics,
      subscriberGrowth,
      campaignPerformance,
      topEngagingPosts,
    ] = await Promise.all([
      // Social media engagement by platform
      prisma.analytics.groupBy({
        by: ["platform"],
        _avg: { engagement: true, reach: true, impressions: true },
        _sum: { likes: true, shares: true, comments: true, clicks: true },
        where: { createdAt: { gte: startDate } },
      }),

      // Email campaign metrics
      prisma.emailCampaign.aggregate({
        _avg: { openRate: true, clickRate: true, bounceRate: true },
        _count: { id: true },
        where: { sentAt: { gte: startDate } },
      }),

      // Subscriber growth over time
      prisma.contact.groupBy({
        by: ["createdAt"],
        _count: { id: true },
        where: { createdAt: { gte: startDate } },
      }),

      // Campaign performance
      prisma.campaign.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        where: { createdAt: { gte: startDate } },
        include: {
          user: { select: { name: true, email: true } },
          posts: {
            include: {
              platformPosts: {
                select: {
                  platform: true,
                  likes: true,
                  shares: true,
                  comments: true,
                  reach: true,
                },
              },
            },
          },
        },
      }),

      // Top engaging posts
      prisma.platformPost.findMany({
        take: 10,
        orderBy: { reach: "desc" },
        where: { createdAt: { gte: startDate } },
        include: {
          post: { select: { title: true, content: true } },
          socialAccount: { select: { accountName: true, platform: true } },
        },
      }),
    ]);

    return NextResponse.json({
      engagementByPlatform: engagementByPlatform.map((data: any) => ({
        platform: data.platform || "Unknown",
        avgEngagement: data._avg.engagement || 0,
        avgReach: data._avg.reach || 0,
        totalLikes: data._sum.likes || 0,
        totalShares: data._sum.shares || 0,
        totalComments: data._sum.comments || 0,
      })),
      emailMetrics: {
        campaignCount: emailCampaignMetrics._count.id,
        avgOpenRate: emailCampaignMetrics._avg.openRate || 0,
        avgClickRate: emailCampaignMetrics._avg.clickRate || 0,
        avgBounceRate: emailCampaignMetrics._avg.bounceRate || 0,
      },
      subscriberGrowth: subscriberGrowth.slice(-30).map((data: any) => ({
        date: data.createdAt,
        count: data._count.id,
      })),
      campaigns: campaignPerformance.map((campaign: any) => {
        const totalEngagement = campaign.posts.reduce(
          (sum: number, post: any) =>
            sum +
            post.platformPosts.reduce(
              (pSum: number, pp: any) => pSum + pp.likes + pp.shares + pp.comments,
              0
            ),
          0
        );
        const totalReach = campaign.posts.reduce(
          (sum: number, post: any) =>
            sum + post.platformPosts.reduce((pSum: number, pp: any) => pSum + pp.reach, 0),
          0
        );

        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          ownerName: campaign.user.name,
          ownerEmail: campaign.user.email,
          postsCount: campaign.posts.length,
          totalEngagement,
          totalReach,
          createdAt: campaign.createdAt,
        };
      }),
      topPosts: topEngagingPosts.map((post: any) => ({
        id: post.id,
        platform: post.platform,
        accountName: post.socialAccount.accountName,
        content: post.post.content?.substring(0, 100),
        reach: post.reach,
        likes: post.likes,
        shares: post.shares,
        comments: post.comments,
        publishedAt: post.publishedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
