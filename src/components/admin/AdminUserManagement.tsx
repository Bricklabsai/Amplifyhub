"use client";
import { useState, useEffect } from "react";
import { HiChevronRight, HiSearch, HiCheckCircle, HiClock } from "react-icons/hi";
import { formatDate } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  postsCount: number;
  campaignsCount: number;
}

export default function AdminUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchEmail, setSearchEmail] = useState("");
  const limit = 10;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/users-management?page=${page}&limit=${limit}`)
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.users);
        setTotal(d.pagination.total);
        setLoading(false);
      });
  }, [page]);

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchEmail.toLowerCase())
  );

  const pages = Math.ceil(total / limit);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold">User Management</h3>
        <div className="relative">
          <HiSearch className="absolute left-3 top-3 text-gray-400 text-lg" />
          <input
            type="email"
            placeholder="Search by email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-400"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-3 font-semibold text-gray-600">User</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-600">Subscription</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-600">Posts</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-600">Campaigns</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-600">Joined</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  Loading users...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-3">
                    <div>
                      <p className="font-medium text-gray-900">{user.name || "No name"}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      {user.subscriptionStatus === "ACTIVE" ? (
                        <HiCheckCircle className="text-green-500" />
                      ) : (
                        <HiClock className="text-gray-400" />
                      )}
                      <span className="text-xs">
                        {user.subscriptionPlan || "No subscription"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-gray-600">{user.postsCount}</td>
                  <td className="py-3 px-3 text-gray-600">{user.campaignsCount}</td>
                  <td className="py-3 px-3 text-xs text-gray-500">
                    {formatDate(new Date(user.createdAt))}
                  </td>
                  <td className="py-3 px-3">
                    <button className="text-violet-600 hover:text-violet-700 transition-colors">
                      <HiChevronRight />
                    </button>
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
          Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total} users
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
  );
}
