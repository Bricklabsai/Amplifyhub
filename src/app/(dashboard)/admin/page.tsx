"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { HiShieldCheck, HiUsers, HiCreditCard, HiChartBar, HiTrendingUp } from "react-icons/hi";
import AdminDashboardMetrics from "@/components/admin/AdminDashboardMetrics";
import AdminUserManagement from "@/components/admin/AdminUserManagement";
import AdminSubscriptionsPayments from "@/components/admin/AdminSubscriptionsPayments";
import AdminPaymentTransactions from "@/components/admin/AdminPaymentTransactions";
import AdminPlatformUsage from "@/components/admin/AdminPlatformUsage";
import AdminAnalytics from "@/components/admin/AdminAnalytics";

type AdminTab = "overview" | "users" | "subscriptions" | "payments" | "usage" | "analytics";

const ADMIN_TABS: Array<{ id: AdminTab; label: string; icon: any }> = [
  { id: "overview", label: "Overview", icon: HiChartBar },
  { id: "users", label: "Users", icon: HiUsers },
  { id: "subscriptions", label: "Subscriptions", icon: HiCreditCard },
  { id: "payments", label: "Payments", icon: HiTrendingUp },
  { id: "usage", label: "Platform Usage", icon: HiChartBar },
  { id: "analytics", label: "Analytics", icon: HiTrendingUp },
];

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  if (!session || (session.user as any)?.role !== "ADMIN") {
    router.push("/dashboard");
    return null;
  }

  return (
    <div className="max-w-7xl space-y-6">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <HiShieldCheck className="text-3xl" />
          <h1 className="text-3xl font-black" style={{ fontFamily: "Outfit, sans-serif" }}>
            Admin Dashboard
          </h1>
        </div>
        <p className="text-white/80 text-base">
          Manage users, monitor subscriptions, track payments, and view platform analytics.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center overflow-x-auto">
          {ADMIN_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === id
                  ? "border-violet-600 text-violet-600 bg-violet-50"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Icon className="text-lg" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            <AdminDashboardMetrics />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-lg font-bold mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">New Users (30d)</span>
                    <span className="text-lg font-bold">+24</span>
                  </div>
                  <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <span className="text-gray-600">Churn Rate</span>
                    <span className="text-lg font-bold">2.3%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Avg Session Duration</span>
                    <span className="text-lg font-bold">12m 34s</span>
                  </div>
                  <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <span className="text-gray-600">Daily Active Users</span>
                    <span className="text-lg font-bold">342</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-lg font-bold mb-4">System Health</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">API Uptime</span>
                    <span className="text-lg font-bold text-green-600">99.9%</span>
                  </div>
                  <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <span className="text-gray-600">Database Status</span>
                    <span className="inline-flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm font-medium">Healthy</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Cache Hit Rate</span>
                    <span className="text-lg font-bold">87.4%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Error Rate</span>
                    <span className="text-lg font-bold text-green-600">0.02%</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Users Tab */}
        {activeTab === "users" && <AdminUserManagement />}

        {/* Subscriptions Tab */}
        {activeTab === "subscriptions" && <AdminSubscriptionsPayments />}

        {/* Payments Tab */}
        {activeTab === "payments" && <AdminPaymentTransactions />}

        {/* Platform Usage Tab */}
        {activeTab === "usage" && <AdminPlatformUsage />}

        {/* Analytics Tab */}
        {activeTab === "analytics" && <AdminAnalytics />}
      </div>
    </div>
  );
}
