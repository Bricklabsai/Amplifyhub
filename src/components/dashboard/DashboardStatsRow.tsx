"use client";

import { HiTrendingUp, HiCalendar, HiShare, HiUsers } from "react-icons/hi";
import { formatNumber } from "@/lib/utils";

function KPICard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ style?: React.CSSProperties; className?: string }>;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: `${color}15` }}
        >
          <Icon style={{ color, fontSize: "1.4rem" }} />
        </div>
      </div>
      <div
        className="mb-1 text-3xl font-black text-gray-900"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {formatNumber(value)}
      </div>
      <div className="text-sm text-gray-500">{title}</div>
    </div>
  );
}

export type DashboardStats = {
  totalFollowers: number;
  totalPosts: number;
  scheduledPosts: number;
  socialAccounts: number;
};

export function DashboardStatsRow({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KPICard
        title="Total Followers"
        value={stats.totalFollowers}
        icon={HiUsers}
        color="#7c3aed"
      />
      <KPICard
        title="Posts Published"
        value={stats.totalPosts}
        icon={HiTrendingUp}
        color="#2563eb"
      />
      <KPICard
        title="Scheduled Posts"
        value={stats.scheduledPosts}
        icon={HiCalendar}
        color="#db2777"
      />
      <KPICard
        title="Social Accounts"
        value={stats.socialAccounts}
        icon={HiShare}
        color="#059669"
      />
    </div>
  );
}
