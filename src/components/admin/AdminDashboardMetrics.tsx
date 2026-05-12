"use client";
import { useState, useEffect } from "react";
import { HiUsers, HiChartBar, HiCheckCircle, HiExclamationCircle } from "react-icons/hi";
import { formatDate } from "@/lib/utils";

interface DashboardMetrics {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  totalTransactions: number;
  newUsersThisMonth: number;
  recentUsers: any[];
  topPerfomingCampaigns: any[];
}

export default function AdminDashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setMetrics(d);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl h-40 animate-pulse border border-gray-100" />
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: "Total Users",
      value: metrics?.totalUsers || 0,
      icon: HiUsers,
      color: "#7c3aed",
      trend: `+${metrics?.newUsersThisMonth || 0} this month`,
    },
    {
      label: "Active Subscriptions",
      value: metrics?.activeSubscriptions || 0,
      icon: HiCheckCircle,
      color: "#2563eb",
      trend: `${metrics?.activeSubscriptions || 0} active`,
    },
    {
      label: "Total Revenue",
      value: `$${(metrics?.totalRevenue || 0).toFixed(2)}`,
      icon: HiChartBar,
      color: "#059669",
      trend: `${metrics?.totalTransactions || 0} transactions`,
    },
    {
      label: "Platform Health",
      value: "Healthy",
      icon: HiExclamationCircle,
      color: "#d97706",
      trend: "All systems operational",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, color, trend }) => (
        <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-black mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                {value}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
              <Icon style={{ color, fontSize: "1.2rem" }} />
            </div>
          </div>
          <p className="text-xs text-gray-400">{trend}</p>
        </div>
      ))}
    </div>
  );
}
