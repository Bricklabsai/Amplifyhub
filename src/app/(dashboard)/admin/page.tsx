"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { HiShieldCheck, HiUsers, HiCreditCard, HiChartBar } from "react-icons/hi";
import { formatDate } from "@/lib/utils";

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session && (session.user as any)?.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
    fetch("/api/admin/users").then((r) => r.json()).then((d) => { setData(d); setLoading(false); });
  }, [session]);

  if (loading) {
    return <div className="bg-white rounded-2xl h-64 animate-pulse border border-gray-100" />;
  }

  const { users = [], totalUsers = 0, activeSubscriptions = 0 } = data || {};

  return (
    <div className="max-w-7xl space-y-6">
      {/* Admin Banner */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <HiShieldCheck className="text-2xl" />
          <h2 className="text-xl font-black" style={{ fontFamily: "Outfit, sans-serif" }}>Admin Panel</h2>
        </div>
        <p className="text-white/80 text-sm">Manage users, subscriptions, and platform settings.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: totalUsers, icon: HiUsers, color: "#7c3aed" },
          { label: "Active Subscriptions", value: activeSubscriptions, icon: HiCreditCard, color: "#2563eb" },
          { label: "Revenue (est.)", value: `$${(activeSubscriptions * 29.99).toFixed(0)}`, icon: HiChartBar, color: "#059669" },
          { label: "Platform Status", value: "Healthy", icon: HiShieldCheck, color: "#d97706" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}15` }}>
              <Icon style={{ color, fontSize: "1.2rem" }} />
            </div>
            <div className="text-2xl font-black text-gray-900 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>All Users ({totalUsers})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {["User", "Email", "Role", "Plan", "Joined"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u: any) => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full brand-gradient-bg flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{u.name?.[0]?.toUpperCase() || "U"}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{u.name || "Unknown"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{u.email}</td>
                  <td className="px-5 py-3">
                    <Badge className={`border-0 text-xs font-medium ${u.role === "ADMIN" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    {u.subscription ? (
                      <Badge className="bg-violet-100 text-violet-700 border-0 text-xs font-medium">{u.subscription.plan?.name}</Badge>
                    ) : (
                      <span className="text-xs text-gray-400">No plan</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
