"use client";
import { useState, useEffect } from "react";
import { HiTrendingUp, HiMail, HiHeart, HiShare } from "react-icons/hi";

interface AnalyticsData {
  engagementByPlatform: Array<{
    platform: string;
    avgEngagement: number;
    avgReach: number;
    totalLikes: number;
    totalShares: number;
    totalComments: number;
  }>;
  emailMetrics: {
    campaignCount: number;
    avgOpenRate: number;
    avgClickRate: number;
    avgBounceRate: number;
  };
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    ownerName: string;
    ownerEmail: string;
    postsCount: number;
    totalEngagement: number;
    totalReach: number;
    createdAt: string;
  }>;
  topPosts: Array<{
    id: string;
    platform: string;
    accountName: string;
    content: string;
    reach: number;
    likes: number;
    shares: number;
    comments: number;
    publishedAt: string;
  }>;
}

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetch(`/api/admin/analytics?days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        setAnalytics(d);
        setLoading(false);
      });
  }, [days]);

  if (loading) {
    return <div className="bg-white rounded-2xl h-96 animate-pulse border border-gray-100" />;
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {[7, 30, 60, 90].map((d) => (
          <button
            key={d}
            onClick={() => {
              setDays(d);
              setLoading(true);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              days === d
                ? "bg-violet-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {d} days
          </button>
        ))}
      </div>

      {/* Email Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-2">
            <HiMail className="text-blue-600 text-2xl" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Emails Sent</p>
              <p className="text-lg font-bold">{analytics?.emailMetrics.campaignCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-2">
            <HiTrendingUp className="text-green-600 text-2xl" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Avg Open Rate</p>
              <p className="text-lg font-bold">{(analytics?.emailMetrics.avgOpenRate || 0).toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-2">
            <HiHeart className="text-pink-600 text-2xl" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Avg Click Rate</p>
              <p className="text-lg font-bold">{(analytics?.emailMetrics.avgClickRate || 0).toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-2">
            <HiShare className="text-orange-600 text-2xl" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Avg Bounce Rate</p>
              <p className="text-lg font-bold">{(analytics?.emailMetrics.avgBounceRate || 0).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Engagement */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-lg font-bold mb-4">Social Media Engagement by Platform</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-3 font-semibold text-gray-600">Platform</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-600">Avg Engagement</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-600">Avg Reach</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-600">Likes</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-600">Shares</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-600">Comments</th>
              </tr>
            </thead>
            <tbody>
              {analytics?.engagementByPlatform.map((data) => (
                <tr key={data.platform} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-3 font-medium">{data.platform || "Unknown"}</td>
                  <td className="py-3 px-3 text-gray-600">{data.avgEngagement.toFixed(1)}</td>
                  <td className="py-3 px-3 text-gray-600">{data.avgReach.toFixed(0)}</td>
                  <td className="py-3 px-3 text-gray-600">{data.totalLikes}</td>
                  <td className="py-3 px-3 text-gray-600">{data.totalShares}</td>
                  <td className="py-3 px-3 text-gray-600">{data.totalComments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Performing Campaigns */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-lg font-bold mb-4">Top Performing Campaigns</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-3 font-semibold text-gray-600">Campaign</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-600">Owner</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-600">Posts</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-600">Total Reach</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-600">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {analytics?.campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-3">
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-xs text-gray-500">
                        Status:{" "}
                        <span className={campaign.status === "ACTIVE" ? "text-green-600" : "text-gray-500"}>
                          {campaign.status}
                        </span>
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div>
                      <p className="font-medium">{campaign.ownerName}</p>
                      <p className="text-xs text-gray-500">{campaign.ownerEmail}</p>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-gray-600">{campaign.postsCount}</td>
                  <td className="py-3 px-3 text-gray-600">{campaign.totalReach.toLocaleString()}</td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 text-xs font-medium">
                      <HiTrendingUp /> {campaign.totalEngagement}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Posts */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-lg font-bold mb-4">Top Engaging Posts</h3>
        <div className="space-y-3">
          {analytics?.topPosts.map((post) => (
            <div key={post.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block px-2.5 py-1 bg-violet-100 text-violet-700 text-xs rounded font-medium">
                      {post.platform}
                    </span>
                    <span className="text-xs text-gray-500">{post.accountName}</span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <HiTrendingUp /> Reach: {post.reach.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <HiHeart /> {post.likes}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <HiShare /> {post.shares}
                </div>
                <div className="text-xs text-gray-600">💬 {post.comments}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
