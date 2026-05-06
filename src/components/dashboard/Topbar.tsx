"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { HiBell, HiCheck, HiX, HiMenu } from "react-icons/hi";
import { formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/compose": "Compose",
  "/posts": "Posts",
  "/social-accounts": "Social Accounts",
  "/campaigns": "Campaigns",
  "/audience": "Audience",
  "/email-campaigns": "Email Campaigns",
  "/ai-studio": "AI Studio",
  "/analytics": "Analytics",
  "/billing": "Billing",
  "/settings": "Settings",
  "/admin": "Admin Panel",
};

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifs();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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
    setNotifs((n) => n.map((x) => x.id === id ? { ...x, read: true } : x));
    setUnread((u) => Math.max(0, u - 1));
  }

  const title = PAGE_TITLES[pathname] || "AmplifyHub";

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <HiMenu className="text-2xl" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">{title}</h1>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">AI Platform</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            className="relative w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <HiBell className="text-gray-600 text-xl" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 brand-gradient-bg rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">
                    <HiCheck className="text-sm" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-sm">No notifications</div>
                ) : (
                  notifs.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.read && markRead(n.id)}
                      className={cn(
                        "flex gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors",
                        !n.read && "bg-violet-50/50"
                      )}
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                        n.type === "success" ? "bg-emerald-400" :
                        n.type === "warning" ? "bg-amber-400" :
                        n.type === "error" ? "bg-red-400" : "bg-blue-400"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatRelative(n.createdAt)}</p>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
