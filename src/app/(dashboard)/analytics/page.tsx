"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatNumber } from "@/lib/utils";
import { downloadAnalyticsCsv } from "@/lib/analytics-export";
import type { DailyMetric, PlatformMetric, PostMetric } from "@/lib/services/analyticsService";
import { HiDownload, HiRefresh } from "react-icons/hi";

const PLATFORM_COLORS: Record<string, string> = {
  FACEBOOK: "#1877F2",
  TWITTER: "#111318",
  INSTAGRAM: "#E1306C",
  LINKEDIN: "#0A66C2",
  TIKTOK: "#111318",
  YOUTUBE: "#FF0000",
  WHATSAPP: "#25D366",
};

const BRAND_PURPLE = "#7331FF";
const BRAND_GOLD = "#FFC01E";
const BRAND_BLUE = "#2563eb";
const BRAND_PINK = "#db2777";

type AnalyticsPayload = {
  daily: DailyMetric[];
  analytics: DailyMetric[];
  platforms: PlatformMetric[];
  topPosts: PostMetric[];
  liveTotals: {
    likes: number;
    comments: number;
    shares: number;
    reach: number;
    followers: number;
    posts: number;
    publishedInRange: number;
  };
  refreshError?: string | null;
  generatedAt: string;
  days: number;
};

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="mb-1 text-xs font-medium text-gray-400">{label}</p>
      <p
        className="text-2xl font-black text-gray-900"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const loadAnalytics = useCallback(async (period: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?days=${period}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load analytics");
      const daily = json.daily ?? json.analytics ?? [];
      setData({ ...json, daily });
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics(days);
  }, [days, loadAnalytics]);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border bg-white" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl border bg-white" />
      </div>
    );
  }

  const daily = data?.daily ?? [];
  const platforms = data?.platforms ?? [];
  const totals = data?.liveTotals ?? {
    likes: 0,
    comments: 0,
    shares: 0,
    reach: 0,
    followers: 0,
    posts: 0,
    publishedInRange: 0,
  };

  const engagementBarData = daily.map((d) => ({
    date: d.dateLabel,
    likes: d.likesDelta,
    comments: d.commentsDelta,
    shares: d.sharesDelta,
  }));

  const trendData = daily.map((d) => ({
    date: d.dateLabel,
    followers: d.followers,
    reach: d.reach,
    engagement: d.engagement,
  }));

  const followersPie = platforms
    .filter((p) => p.followers > 0)
    .map((p) => ({
      name: p.platform,
      value: p.followers,
      color: PLATFORM_COLORS[p.platform] || BRAND_PURPLE,
    }));

  const platformEngagement = platforms
    .filter((p) => p.likes + p.comments + p.shares > 0)
    .map((p) => ({
      name: p.platform,
      engagement: p.likes + p.comments + p.shares,
      likes: p.likes,
      comments: p.comments,
      color: PLATFORM_COLORS[p.platform] || BRAND_PURPLE,
    }));

  const engagementBreakdown = [
    { name: "Likes", value: totals.likes, color: BRAND_PURPLE },
    { name: "Comments", value: totals.comments, color: BRAND_BLUE },
    { name: "Shares", value: totals.shares, color: BRAND_PINK },
  ].filter((x) => x.value > 0);

  const handleExport = () => {
    if (!data) return;
    downloadAnalyticsCsv({
      generatedAt: data.generatedAt,
      days: data.days,
      daily: data.daily,
      platforms: data.platforms,
      topPosts: data.topPosts,
      liveTotals: data.liveTotals,
      refreshError: data.refreshError,
    });
  };

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2
            className="text-2xl font-bold text-gray-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Analytics Overview
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Live engagement from your connected accounts and published posts
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadAnalytics(days)}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-all hover:bg-gray-50 disabled:opacity-50"
          >
            <HiRefresh className={`text-sm ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!data || daily.length === 0}
            className="flex items-center gap-2 rounded-lg border border-[#7331FF]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[#7331FF] transition-all hover:bg-[#7331FF]/5 disabled:opacity-50"
          >
            <HiDownload className="text-sm" />
            Export all
          </button>
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                days === d
                  ? "brand-gradient-bg text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      {data?.refreshError && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Some live data could not be refreshed — showing the latest saved metrics.
        </div>
      )}

      {daily.length === 0 && !loading && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No analytics data yet. Connect social accounts, publish posts, then refresh.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Total Followers"
          value={formatNumber(totals.followers)}
          sub="Across all platforms"
        />
        <StatCard
          label="Total Reach"
          value={formatNumber(totals.reach)}
          sub={`Last ${days} days`}
        />
        <StatCard label="Total Likes" value={formatNumber(totals.likes)} />
        <StatCard label="Total Comments" value={formatNumber(totals.comments)} />
        <StatCard label="Total Shares" value={formatNumber(totals.shares)} />
        <StatCard
          label="Published Posts"
          value={formatNumber(totals.posts)}
          sub={`${totals.publishedInRange} in range`}
        />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3
          className="mb-6 font-bold text-gray-900"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Followers & Reach Trend
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={BRAND_PURPLE} stopOpacity={0.25} />
                <stop offset="95%" stopColor={BRAND_PURPLE} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={BRAND_BLUE} stopOpacity={0.2} />
                <stop offset="95%" stopColor={BRAND_BLUE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: "12px" }}
              formatter={(v: number) => formatNumber(v)}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="followers"
              name="Followers"
              stroke={BRAND_PURPLE}
              fill="url(#colorFollowers)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="reach"
              name="Reach"
              stroke={BRAND_BLUE}
              fill="url(#colorReach)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3
            className="mb-6 font-bold text-gray-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Daily Engagement
          </h3>
          <p className="-mt-4 mb-4 text-xs text-gray-400">
            Likes, comments, and shares per day (from live post metrics)
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={engagementBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
              <Legend />
              <Bar dataKey="likes" name="Likes" fill={BRAND_PURPLE} radius={[4, 4, 0, 0]} />
              <Bar dataKey="comments" name="Comments" fill={BRAND_BLUE} radius={[4, 4, 0, 0]} />
              <Bar dataKey="shares" name="Shares" fill={BRAND_PINK} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3
            className="mb-6 font-bold text-gray-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Engagement by Platform
          </h3>
          {platformEngagement.length === 0 ? (
            <div className="flex h-60 items-center justify-center text-sm text-gray-400">
              No engagement on connected platforms yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={platformEngagement} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                />
                <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                <Bar dataKey="engagement" name="Total engagement" radius={[0, 4, 4, 0]}>
                  {platformEngagement.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3
            className="mb-6 font-bold text-gray-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Followers by Platform
          </h3>
          {followersPie.length === 0 ? (
            <div className="flex h-60 items-center justify-center text-sm text-gray-400">
              No social accounts connected
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={followersPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {followersPie.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                  formatter={(v: number) => formatNumber(v)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3
            className="mb-6 font-bold text-gray-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Engagement Mix
          </h3>
          {engagementBreakdown.length === 0 ? (
            <div className="flex h-60 items-center justify-center text-sm text-gray-400">
              No likes, comments, or shares yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={engagementBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {engagementBreakdown.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                  formatter={(v: number) => formatNumber(v)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3
          className="mb-6 font-bold text-gray-900"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Engagement Rate (%)
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={BRAND_GOLD} stopOpacity={0.35} />
                <stop offset="95%" stopColor={BRAND_GOLD} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} unit="%" />
            <Tooltip
              contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
              formatter={(v: number) => `${v}%`}
            />
            <Area
              type="monotone"
              dataKey="engagement"
              name="Engagement Rate"
              stroke={BRAND_GOLD}
              fill="url(#colorEng)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {data && data.topPosts.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3
            className="mb-4 font-bold text-gray-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Top Posts by Engagement
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400">
                  <th className="pb-3 pr-4 font-medium">Post</th>
                  <th className="pb-3 pr-4 font-medium">Platform</th>
                  <th className="pb-3 pr-4 font-medium">Likes</th>
                  <th className="pb-3 pr-4 font-medium">Comments</th>
                  <th className="pb-3 font-medium">Shares</th>
                </tr>
              </thead>
              <tbody>
                {data.topPosts.slice(0, 10).map((p) => (
                  <tr key={`${p.postId}-${p.platform}`} className="border-b border-gray-50">
                    <td className="max-w-[200px] truncate py-3 pr-4 font-medium text-gray-900">
                      {p.title}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{p.platform}</td>
                    <td className="py-3 pr-4">{formatNumber(p.likes)}</td>
                    <td className="py-3 pr-4">{formatNumber(p.comments)}</td>
                    <td className="py-3">{formatNumber(p.shares)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
