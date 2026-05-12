import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      totalUsers,
      activeUsers,
      totalPosts,
      publishedPosts,
      totalCampaigns,
      activeCampaigns,
      emailCampaignsSent,
      totalContacts,
      activeSocialAccounts,
      platformDistribution,
      usageTrend,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),

      // Active users (with posts or campaigns in last 30 days)
      prisma.user.count({
        where: {
          OR: [
            { posts: { some: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } } },
            { campaigns: { some: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } } },
          ],
        },
      }),

      // Total posts
      prisma.post.count(),

      // Published posts
      prisma.post.count({ where: { status: "PUBLISHED" } }),

      // Total campaigns
      prisma.campaign.count(),

      // Active campaigns
      prisma.campaign.count({ where: { status: "ACTIVE" } }),

      // Email campaigns sent
      prisma.emailCampaign.count({ where: { status: "SENT" } }),

      // Total contacts
      prisma.contact.count(),

      // Active social accounts
      prisma.socialAccount.count({ where: { isActive: true } }),

      // Platform distribution
      prisma.socialAccount.groupBy({
        by: ["platform"],
        _count: { id: true },
      }),

      // Usage trend (last 30 days)
      prisma.post.groupBy({
        by: ["createdAt"],
        _count: { id: true },
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    const usagePercentage = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

    return NextResponse.json({
      overview: {
        totalUsers,
        activeUsers,
        usagePercentage: Math.round(usagePercentage),
        totalPosts,
        publishedPosts,
        publishRate: totalPosts > 0 ? Math.round((publishedPosts / totalPosts) * 100) : 0,
      },
      campaigns: {
        totalCampaigns,
        activeCampaigns,
        inactiveCampaigns: totalCampaigns - activeCampaigns,
      },
      email: {
        emailCampaignsSent,
        totalContacts,
        avgContactsPerCampaign: emailCampaignsSent > 0 ? Math.round(totalContacts / emailCampaignsSent) : 0,
      },
      socialMedia: {
        totalSocialAccounts: activeSocialAccounts,
        platformBreakdown: platformDistribution.map((item: any) => ({
          platform: item.platform,
          count: item._count.id,
        })),
      },
      trends: {
        postsLastThirtyDays: usageTrend.reduce((sum: number, item: any) => sum + item._count.id, 0),
        avgPostsPerDay:
          usageTrend.length > 0
            ? Math.round(usageTrend.reduce((sum: number, item: any) => sum + item._count.id, 0) / 30)
            : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching platform usage:", error);
    return NextResponse.json({ error: "Failed to fetch platform usage" }, { status: 500 });
  }
}
