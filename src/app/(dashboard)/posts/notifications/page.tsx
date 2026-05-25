"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiBell, HiCheck, HiArrowLeft } from "react-icons/hi";
import { formatRelative } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { isNavigableNotificationLink } from "@/lib/notification-utils";

type Notification = {
  id: string;
  type: string;
  message: string;
  read: boolean;
  link?: string | null;
  createdAt: string;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/notifications");
    const data = await res.json();
    setNotifications(data.notifications || []);
    setUnread(data.unreadCount || 0);
    setLoading(false);
  }

  async function markAllRead() {
    await fetch("/api/notifications/all/read", { method: "PATCH" });
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));
    setUnread(0);
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((n) =>
      n.map((x) => (x.id === id ? { ...x, read: true } : x))
    );
    setUnread((u) => Math.max(0, u - 1));
  }

  async function openNotification(n: Notification) {
    if (!n.read) await markRead(n.id);
    if (isNavigableNotificationLink(n.link ?? undefined)) {
      router.push(n.link!);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
          >
            <HiArrowLeft className="text-lg" />
          </Link>
          <div>
            <h2
              className="text-2xl font-bold text-gray-900"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Notifications
            </h2>
            <p className="text-sm text-gray-500">
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </p>
          </div>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1">
            <HiCheck /> Mark all read
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-50" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <HiBell className="mx-auto mb-3 text-4xl text-gray-200" />
            <p className="font-medium">No notifications yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openNotification(n)}
                  className={`flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-gray-50/80 ${
                    !n.read ? "bg-violet-50/30" : ""
                  }`}
                >
                  <div
                    className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                      n.read ? "bg-transparent" : "bg-violet-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{n.type}</p>
                    <p className="mt-0.5 text-sm text-gray-600">{n.message}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {formatRelative(n.createdAt)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
