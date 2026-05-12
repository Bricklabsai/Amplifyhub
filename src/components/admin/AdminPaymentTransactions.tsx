"use client";
import { useState, useEffect } from "react";
import { HiCheckCircle, HiXCircle, HiClock, HiArrowNarrowUp, HiArrowNarrowDown } from "react-icons/hi";
import { formatDate } from "@/lib/utils";

interface Transaction {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: string;
  channel?: string;
  reference: string;
  paidAt?: string;
  createdAt: string;
}

interface PaymentStats {
  total: number;
  successful: number;
  failed: number;
  pending: number;
}

export default function AdminPaymentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<PaymentStats>({ total: 0, successful: 0, failed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const limit = 10;

  useEffect(() => {
    setLoading(true);
    const query = statusFilter ? `?status=${statusFilter}&page=${page}&limit=${limit}` : `?page=${page}&limit=${limit}`;
    fetch(`/api/admin/payments${query}`)
      .then((r) => r.json())
      .then((d) => {
        setTransactions(d.transactions);
        setStats(d.stats);
        setTotal(d.pagination.total);
        setLoading(false);
      });
  }, [page, statusFilter]);

  const pages = Math.ceil(total / limit);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <HiCheckCircle className="text-green-500" />;
      case "failed":
        return <HiXCircle className="text-red-500" />;
      case "pending":
        return <HiClock className="text-amber-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-50 text-green-700";
      case "failed":
        return "bg-red-50 text-red-700";
      case "pending":
        return "bg-amber-50 text-amber-700";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 font-medium uppercase">Total Revenue</p>
          <p className="text-2xl font-black mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
            ${stats.total.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-2">All transactions</p>
        </div>

        <div
          className="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer transition-all hover:border-green-300"
          onClick={() => {
            setStatusFilter(statusFilter === "success" ? null : "success");
            setPage(1);
          }}
        >
          <p className="text-xs text-gray-500 font-medium uppercase">Successful</p>
          <p className="text-2xl font-black mt-1 text-green-600" style={{ fontFamily: "Outfit, sans-serif" }}>
            ${stats.successful.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-2">Completed payments</p>
        </div>

        <div
          className="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer transition-all hover:border-red-300"
          onClick={() => {
            setStatusFilter(statusFilter === "failed" ? null : "failed");
            setPage(1);
          }}
        >
          <p className="text-xs text-gray-500 font-medium uppercase">Failed</p>
          <p className="text-2xl font-black mt-1 text-red-600" style={{ fontFamily: "Outfit, sans-serif" }}>
            ${stats.failed.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-2">Failed transactions</p>
        </div>

        <div
          className="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer transition-all hover:border-amber-300"
          onClick={() => {
            setStatusFilter(statusFilter === "pending" ? null : "pending");
            setPage(1);
          }}
        >
          <p className="text-xs text-gray-500 font-medium uppercase">Pending</p>
          <p className="text-2xl font-black mt-1 text-amber-600" style={{ fontFamily: "Outfit, sans-serif" }}>
            ${stats.pending.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-2">Awaiting confirmation</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">Payment Transactions {statusFilter && `(${statusFilter})`}</h3>
          {statusFilter && (
            <button
              onClick={() => {
                setStatusFilter(null);
                setPage(1);
              }}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear filter
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-3 font-semibold text-gray-600">User</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-600">Amount</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-600">Status</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-600">Channel</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-600">Date</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-600">Reference</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3">
                      <div>
                        <p className="font-medium text-gray-900">{tx.userName}</p>
                        <p className="text-xs text-gray-500">{tx.userEmail}</p>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        {tx.status === "success" ? (
                          <HiArrowNarrowUp className="text-green-500" />
                        ) : (
                          <HiArrowNarrowDown className="text-gray-400" />
                        )}
                        <span className="font-medium">
                          {tx.currency} {tx.amount.toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusColor(tx.status)}`}>
                        {getStatusIcon(tx.status)}
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-600">
                      {tx.channel || "N/A"}
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-500">
                      {formatDate(new Date(tx.createdAt))}
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-500 font-mono">
                      {tx.reference.substring(0, 12)}...
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
            Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total} transactions
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
