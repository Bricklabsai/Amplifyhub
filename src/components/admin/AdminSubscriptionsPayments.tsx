"use client";
import { useState, useEffect } from "react";
import { HiCheckCircle, HiXCircle, HiClock } from "react-icons/hi";
import { formatDate } from "@/lib/utils";

interface Subscription {
  id: string;
  userName: string;
  userEmail: string;
  planName: string;
  planPrice: number;
  status: string;
  startDate: string;
  endDate?: string;
  postsUsed: number;
  aiTextUsed: number;
  aiImageUsed: number;
}

interface SubscriptionStats {
  ACTIVE: number;
  CANCELLED: number;
  EXPIRED: number;
}

export default function AdminSubscriptionsPayments() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats>({ ACTIVE: 0, CANCELLED: 0, EXPIRED: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const limit = 10;

  useEffect(() => {
    setLoading(true);
    const query = statusFilter ? `?status=${statusFilter}&page=${page}&limit=${limit}` : `?page=${page}&limit=${limit}`;
    fetch(`/api/admin/subscriptions${query}`)
      .then((r) => r.json())
      .then((d) => {
        setSubscriptions(d.subscriptions);
        setStats(d.stats);
        setTotal(d.pagination.total);
        setLoading(false);
      });
  }, [page, statusFilter]);

  const pages = Math.ceil(total / limit);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <HiCheckCircle className="text-green-500" />;
      case "CANCELLED":
        return <HiXCircle className="text-red-500" />;
      case "EXPIRED":
        return <HiClock className="text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-50 text-green-700";
      case "CANCELLED":
        return "bg-red-50 text-red-700";
      case "EXPIRED":
        return "bg-gray-50 text-gray-700";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active", count: stats.ACTIVE, status: "ACTIVE" },
          { label: "Cancelled", count: stats.CANCELLED, status: "CANCELLED" },
          { label: "Expired", count: stats.EXPIRED, status: "EXPIRED" },
        ].map(({ label, count, status }) => (
          <div
            key={status}
            onClick={() => {
              setStatusFilter(status);
              setPage(1);
            }}
            className={`bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer transition-all ${
              statusFilter === status ? "border-violet-300 bg-violet-50" : "hover:border-gray-200"
            }`}
          >
            <p className="text-xs text-gray-500 font-medium uppercase">{label}</p>
            <p className="text-2xl font-black mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
              {count}
            </p>
          </div>
        ))}
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-lg font-bold mb-6">Subscriptions ({statusFilter})</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-3 font-semibold text-gray-600">User</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-600">Plan</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-600">Status</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-600">Start Date</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-600">Usage</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    Loading subscriptions...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    No subscriptions found
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3">
                      <div>
                        <p className="font-medium text-gray-900">{sub.userName}</p>
                        <p className="text-xs text-gray-500">{sub.userEmail}</p>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div>
                        <p className="font-medium">{sub.planName}</p>
                        <p className="text-xs text-gray-500">${sub.planPrice}/month</p>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusColor(sub.status)}`}>
                        {getStatusIcon(sub.status)}
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-500">
                      {formatDate(new Date(sub.startDate))}
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-xs space-y-1">
                        <p>Posts: {sub.postsUsed}</p>
                        <p>AI: {sub.aiTextUsed}% used</p>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total} subscriptions
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm font-medium">
              Page {page} of {pages}
            </span>
            <button
              disabled={page === pages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
