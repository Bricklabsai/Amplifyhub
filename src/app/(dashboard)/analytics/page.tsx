"use client";
import { useState, useEffect } from "react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatNumber } from "@/lib/utils";

const PLATFORM_COLORS: Record<string, string> = {
  FACEBOOK: "#1877F2",
  TWITTER: "#000000",
  INSTAGRAM: "#E1306C",
  LINKEDIN: "#0A66C2",
  TIKTOK: "#000000",
  YOUTUBE: "#FF0000",
  WHATSAPP: "#25D366",
};

function StatCard({ label, value, sub }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
      <p className="text-2xl font-black text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetch(`/api/analytics?days=${days}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [days]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border" />)}
        </div>
        <div className="bg-white rounded-2xl h-64 animate-pulse border" />
      </div>
    );
  }

  const { analytics = [], platforms = [] } = data || {};

  const chartData = analytics.map((a: any) => ({
    date: new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    followers: a.followers,
    reach: a.reach,
    impressions: a.impressions,
    engagement: parseFloat(a.engagement?.toFixed(1) || "0"),
    likes: a.likes,
    comments: a.comments,
    shares: a.shares,
  }));

  const totals = analytics.reduce((acc: any, a: any) => ({
    likes: acc.likes + a.likes,
    comments: acc.comments + a.comments,
    shares: acc.shares + a.shares,
    reach: acc.reach + a.reach,
  }), { likes: 0, comments: 0, shares: 0, reach: 0 });

  const pieData = platforms.map((p: any) => ({
    name: p.platform,
    value: p.followers,
    color: PLATFORM_COLORS[p.platform] || "#7c3aed",
  }));

  const engagementData = [
    { name: "Likes", value: totals.likes, color: "#7c3aed" },
    { name: "Comments", value: totals.comments, color: "#2563eb" },
    { name: "Shares", value: totals.shares, color: "#db2777" },
  ];

  return (
    <div className="max-w-7xl space-y-6">
      {/* Period Toggle */}
      <div className="flex items-center gap-2 justify-end">
        {[7, 14, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              days === d ? "brand-gradient-bg text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {d}D
          </button>
        ))}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Reach" value={formatNumber(totals.reach)} sub={`Last ${days} days`} />
        <StatCard label="Total Likes" value={formatNumber(totals.likes)} sub="Across all platforms" />
        <StatCard label="Total Comments" value={formatNumber(totals.comments)} sub="Across all platforms" />
        <StatCard label="Total Shares" value={formatNumber(totals.shares)} sub="Across all platforms" />
      </div>

      {/* Followers Trend */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-6" style={{ fontFamily: "Outfit, sans-serif" }}>Followers & Reach Trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: "12px" }}
              formatter={(v: any) => formatNumber(v)}
            />
            <Legend />
            <Area type="monotone" dataKey="followers" name="Followers" stroke="#7c3aed" fill="url(#colorFollowers)" strokeWidth={2} />
            <Area type="monotone" dataKey="reach" name="Reach" stroke="#2563eb" fill="url(#colorReach)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-6" style={{ fontFamily: "Outfit, sans-serif" }}>Daily Engagement</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
              <Legend />
              <Bar dataKey="likes" name="Likes" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              <Bar dataKey="comments" name="Comments" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="shares" name="Shares" fill="#db2777" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Platform Distribution Pie */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-6" style={{ fontFamily: "Outfit, sans-serif" }}>Followers by Platform</h3>
          {pieData.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-gray-400 text-sm">
              No social accounts connected
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                  formatter={(v: any) => formatNumber(v)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Engagement Rate */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-6" style={{ fontFamily: "Outfit, sans-serif" }}>Engagement Rate (%)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#db2777" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#db2777" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} unit="%" />
            <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} formatter={(v: any) => `${v}%`} />
            <Area type="monotone" dataKey="engagement" name="Engagement Rate" stroke="#db2777" fill="url(#colorEng)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
