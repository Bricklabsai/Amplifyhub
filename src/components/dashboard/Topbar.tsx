"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  HiBell,
  HiCheck,
  HiMenu,
  HiCog,
  HiLogout,
  HiUser,
} from "react-icons/hi";
import { formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/compose": "Compose",
  "/posts": "Posts",
  "/social-accounts": "Social Accounts",
  "/campaigns": "Campaigns",
  "/audience": "Audience",
  "/team": "Team",
  "/email-hub": "Email Hub",
  "/ai-studio": "AI Studio",
  "/analytics": "Analytics",
  "/billing": "Billing",
  "/profile": "Profile",
  "/settings": "Settings",
  "/admin": "Admin Panel",
};

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchNotifs();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function fetchNotifs() {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifs(data.notifications);
      setUnread(data.unreadCount);
    }
  }

  async function markAllRead() {
    await fetch("/api/notifications/all/read", { method: "PATCH" });
    setNotifs((n) => n.map((x) => ({ ...x, read: true })));
    setUnread(0);
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifs((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x)));
    setUnread((u) => Math.max(0, u - 1));
  }

  const title = PAGE_TITLES[pathname] || "AmplifyHub";
  const initial =
    session?.user?.name?.[0]?.toUpperCase() ||
    session?.user?.email?.[0]?.toUpperCase() ||
    "U";

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 md:px-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="-ml-2 rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 md:hidden"
        >
          <HiMenu className="text-2xl" />
        </button>
        <div>
          <h1 className="text-lg font-bold leading-tight text-gray-900">{title}</h1>
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
            AI Platform
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen(!notifOpen);
              setMenuOpen(false);
            }}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 transition-colors hover:bg-[#7331FF]/10"
            aria-label="Notifications"
          >
            <HiBell className="text-xl text-gray-600" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full brand-gradient-bg text-[10px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs font-medium text-[#7331FF] hover:underline"
                  >
                    <HiCheck className="text-sm" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">
                    No notifications
                  </div>
                ) : (
                  notifs.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.read && markRead(n.id)}
                      className={cn(
                        "flex cursor-pointer gap-3 border-b border-gray-50 px-4 py-3 transition-colors hover:bg-gray-50",
                        !n.read && "bg-[#7331FF]/5"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-1.5 h-2 w-2 flex-shrink-0 rounded-full",
                          n.type === "success"
                            ? "bg-emerald-400"
                            : n.type === "warning"
                              ? "bg-amber-400"
                              : n.type === "error"
                                ? "bg-red-400"
                                : "bg-[#7331FF]"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                          {n.message}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {formatRelative(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Account menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(!menuOpen);
              setNotifOpen(false);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl brand-gradient-bg text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
            aria-label="Account menu"
          >
            {initial}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white py-1 shadow-2xl">
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="truncate text-sm font-bold text-gray-900">
                  {session?.user?.name || "User"}
                </p>
                <p className="truncate text-xs text-gray-500">{session?.user?.email}</p>
              </div>
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-[#7331FF]/10 hover:text-[#7331FF]"
              >
                <HiUser className="text-lg text-[#7331FF]" />
                Profile
              </Link>
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-[#7331FF]/10 hover:text-[#7331FF]"
              >
                <HiCog className="text-lg text-[#7331FF]" />
                Settings
              </Link>
              <div className="my-1 border-t border-gray-100" />
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <HiLogout className="text-lg" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
