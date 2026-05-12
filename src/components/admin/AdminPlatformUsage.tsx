"use client";
import { useState, useEffect } from "react";
import { HiUsers, HiCollection, HiShare, HiMail } from "react-icons/hi";

interface PlatformUsage {
  overview: {
    totalUsers: number;
    activeUsers: number;
    usagePercentage: number;
    totalPosts: number;
    publishedPosts: number;
    publishRate: number;
  };
  campaigns: {
    totalCampaigns: number;
    activeCampaigns: number;
    inactiveCampaigns: number;
  };
  email: {
    emailCampaignsSent: number;
    totalContacts: number;
    avgContactsPerCampaign: number;
  };
  socialMedia: {
    totalSocialAccounts: number;
    platformBreakdown: Array<{ platform: string; count: number }>;
  };
  trends: {
    postsLastThirtyDays: number;
    avgPostsPerDay: number;
  };
}

export default function AdminPlatformUsage() {
  const [usage, setUsage] = useState<PlatformUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/platform-usage")
      .then((r) => r.json())
      .then((d) => {
        setUsage(d);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="bg-white rounded-2xl h-96 animate-pulse border border-gray-100" />;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-2">
            <HiUsers className="text-violet-600 text-2xl" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Active Users</p>
              <p className="text-lg font-bold">{usage?.overview.activeUsers}/{usage?.overview.totalUsers}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 ml-11">{usage?.overview.usagePercentage}% engaged</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-2">
            <HiCollection className="text-blue-600 text-2xl" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Posts Published</p>
              <p className="text-lg font-bold">{usage?.overview.publishedPosts}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 ml-11">{usage?.overview.publishRate}% publish rate</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-2">
            <HiShare className="text-green-600 text-2xl" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Social Accounts</p>
              <p className="text-lg font-bold">{usage?.socialMedia.totalSocialAccounts}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 ml-11">Across {usage?.socialMedia.platformBreakdown.length} platforms</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-2">
            <HiMail className="text-orange-600 text-2xl" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Email Contacts</p>
              <p className="text-lg font-bold">{usage?.email.totalContacts}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 ml-11">{usage?.email.emailCampaignsSent} campaigns sent</p>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Campaigns */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-lg font-bold mb-4">Campaign Overview</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Total Campaigns</span>
              <span className="text-lg font-bold">{usage?.campaigns.totalCampaigns}</span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Active</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-lg font-bold text-green-600">{usage?.campaigns.activeCampaigns}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Inactive</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                <span className="text-lg font-bold text-gray-600">{usage?.campaigns.inactiveCampaigns}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-lg font-bold mb-4">Platform Distribution</h3>
          <div className="space-y-3">
            {usage?.socialMedia.platformBreakdown.map((item) => (
              <div key={item.platform} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.platform || "Unknown"}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${
                        ((item.count || 0) /
                          Math.max(
                            ...(usage?.socialMedia.platformBreakdown.map((p) => p.count || 0) || [1])
                          )) *
                        100
                      }px`,
                      maxWidth: "150px",
                      backgroundColor: "#7c3aed",
                    }}
                  />
                  <span className="text-sm font-medium text-gray-900 min-w-[2rem]">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trends */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-lg font-bold mb-4">30-Day Trends</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl">
            <p className="text-xs text-violet-700 font-medium mb-1">Posts Last 30 Days</p>
            <p className="text-3xl font-black text-violet-900">{usage?.trends.postsLastThirtyDays}</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
            <p className="text-xs text-blue-700 font-medium mb-1">Avg Posts Per Day</p>
            <p className="text-3xl font-black text-blue-900">{usage?.trends.avgPostsPerDay}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
