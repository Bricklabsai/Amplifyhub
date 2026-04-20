"use client";
import { useState, useEffect } from "react";
import { HiTrendingUp, HiCalendar, HiShare, HiUsers, HiSparkles } from "react-icons/hi";
import { formatNumber, formatRelative } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

function KPICard({ title, value, change, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center`} style={{ background: `${color}15` }}>
          <Icon style={{ color, fontSize: "1.4rem" }} />
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${change >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
          {change >= 0 ? "+" : ""}{change}%
        </span>
      </div>
      <div className="text-3xl font-black text-gray-900 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
        {typeof value === "number" ? formatNumber(value) : value}
      </div>
      <div className="text-sm text-gray-500">{title}</div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  DRAFT: "bg-gray-100 text-gray-600",
  FAILED: "bg-red-100 text-red-700",
};

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const { stats, recentPosts } = data || {};

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
            Welcome back 👋
          </h2>
          <p className="text-gray-500 text-sm mt-1">Here's what's happening with your social media today.</p>
        </div>
        <Link href="/compose">
          <button className="brand-gradient-bg text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md hover:opacity-90 transition-opacity">
            <HiSparkles className="text-base" />
            New Post
          </button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Followers" value={stats?.totalFollowers || 0} change={12.4} icon={HiUsers} color="#7c3aed" />
        <KPICard title="Posts Published" value={stats?.totalPosts || 0} change={8.2} icon={HiTrendingUp} color="#2563eb" />
        <KPICard title="Scheduled Posts" value={stats?.scheduledPosts || 0} change={-3.1} icon={HiCalendar} color="#db2777" />
        <KPICard title="Social Accounts" value={stats?.socialAccounts || 0} change={0} icon={HiShare} color="#059669" />
      </div>

      {/* Recent Posts */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between p-6 border-b border-gray-50">
          <h3 className="font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>Recent Posts</h3>
          <Link href="/posts" className="text-sm text-violet-600 hover:text-violet-700 font-medium">View all →</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentPosts?.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <HiSparkles className="text-4xl mx-auto mb-3 text-gray-200" />
              <p className="font-medium">No posts yet</p>
              <p className="text-sm mt-1">Create your first post to get started</p>
            </div>
          )}
          {recentPosts?.map((post: any) => (
            <div key={post.id} className="flex items-start gap-4 p-4 hover:bg-gray-50/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 leading-relaxed line-clamp-2">{post.content}</p>
                <p className="text-xs text-gray-400 mt-2">{formatRelative(post.createdAt)}</p>
              </div>
              <Badge className={`${STATUS_COLORS[post.status]} border-0 text-xs font-medium flex-shrink-0`}>{post.status}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: "/compose", label: "AI Compose", emoji: "✨", desc: "Generate content" },
          { href: "/analytics", label: "Analytics", emoji: "📊", desc: "View performance" },
          { href: "/social-accounts", label: "Connect", emoji: "🔗", desc: "Add social account" },
          { href: "/billing", label: "Upgrade", emoji: "⚡", desc: "Get more features" },
        ].map(({ href, label, emoji, desc }) => (
          <Link key={href} href={href}>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
              <div className="text-2xl mb-2">{emoji}</div>
              <div className="font-bold text-gray-900 text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>{label}</div>
              <div className="text-gray-400 text-xs mt-0.5">{desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
