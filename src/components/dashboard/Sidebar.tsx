"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  HiHome,
  HiPencil,
  HiCollection,
  HiShare,
  HiFlag,
  HiUsers,
  HiMail,
  HiPhotograph,
  HiChartBar,
  HiCreditCard,
  HiShieldCheck,
  HiUserGroup,
  HiX,
  HiChevronDown,
  HiInbox,
} from "react-icons/hi";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", icon: HiHome, label: "Dashboard" },
  { href: "/compose", icon: HiPencil, label: "Compose" },
  { href: "/social-accounts", icon: HiShare, label: "Social Accounts" },
  { href: "/campaigns", icon: HiFlag, label: "Campaigns" },
  { href: "/audience", icon: HiUsers, label: "Audience" },
  { href: "/team", icon: HiUserGroup, label: "Team" },
  { href: "/email-hub", icon: HiMail, label: "Email Hub" },
  { href: "/ai-studio", icon: HiPhotograph, label: "AI Studio" },
  { href: "/analytics", icon: HiChartBar, label: "Analytics" },
  { href: "/billing", icon: HiCreditCard, label: "Billing" },
];

const POSTS_CHILDREN = [
  { href: "/posts", icon: HiCollection, label: "Overview" },
  { href: "/posts/messages", icon: HiInbox, label: "Messages" },
];

export default function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";
  const postsActive =
    pathname === "/posts" || pathname.startsWith("/posts/");
  const [postsOpen, setPostsOpen] = useState(postsActive);

  return (
    <aside
      className={cn(
        "sidebar-gradient z-[60] flex h-full w-64 flex-shrink-0 flex-col shadow-2xl transition-all duration-300 fixed md:relative md:z-0",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 p-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div>
            <span className="block text-lg font-black leading-tight text-white">
              Amplify
              <span
                style={{
                  background:
                    "linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Hub
              </span>
            </span>
            <span className="text-xs text-white/40">AI Platform</span>
          </div>
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-white/50 transition-colors hover:text-white md:hidden"
        >
          <HiX className="text-xl" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {NAV_ITEMS.slice(0, 2).map(({ href, icon: Icon, label }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => {
                if (window.innerWidth < 768) onClose();
              }}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                active
                  ? "sidebar-item-active bg-white/10 text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white/80"
              )}
            >
              <Icon
                className={cn(
                  "flex-shrink-0 text-lg",
                  active
                    ? "text-violet-300"
                    : "text-white/40 group-hover:text-white/60"
                )}
              />
              <span className="font-medium">{label}</span>
              {active && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" />
              )}
            </Link>
          );
        })}

        {/* Posts with dropdown */}
        <div>
          <button
            type="button"
            onClick={() => setPostsOpen((o) => !o)}
            className={cn(
              "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
              postsActive
                ? "sidebar-item-active bg-white/10 text-white"
                : "text-white/50 hover:bg-white/5 hover:text-white/80"
            )}
          >
            <HiCollection
              className={cn(
                "flex-shrink-0 text-lg",
                postsActive ? "text-violet-300" : "text-white/40 group-hover:text-white/60"
              )}
            />
            <span className="font-medium">Posts</span>
            <HiChevronDown
              className={cn(
                "ml-auto text-sm transition-transform",
                postsOpen && "rotate-180"
              )}
            />
          </button>
          {postsOpen && (
            <div className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-2">
              {POSTS_CHILDREN.map(({ href, icon: Icon, label }) => {
                const active =
                  href === "/posts"
                    ? pathname === "/posts"
                    : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => {
                      if (window.innerWidth < 768) onClose();
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all",
                      active
                        ? "bg-white/10 font-semibold text-white"
                        : "text-white/45 hover:bg-white/5 hover:text-white/75"
                    )}
                  >
                    <Icon className="text-sm" />
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {NAV_ITEMS.slice(2).map(({ href, icon: Icon, label }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => {
                if (window.innerWidth < 768) onClose();
              }}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                active
                  ? "sidebar-item-active bg-white/10 text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white/80"
              )}
            >
              <Icon
                className={cn(
                  "flex-shrink-0 text-lg",
                  active
                    ? "text-violet-300"
                    : "text-white/40 group-hover:text-white/60"
                )}
              />
              <span className="font-medium">{label}</span>
              {active && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" />
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pb-1 pt-4">
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-white/20">
                Admin
              </p>
            </div>
            <Link
              href="/admin"
              onClick={() => {
                if (window.innerWidth < 768) onClose();
              }}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                pathname === "/admin"
                  ? "sidebar-item-active bg-white/10 text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white/80"
              )}
            >
              <HiShieldCheck className="flex-shrink-0 text-lg text-amber-400" />
              <span className="font-medium">Admin Panel</span>
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="px-3 text-center text-[10px] text-white/30">
          Profile & settings are in the top bar →
        </p>
      </div>
    </aside>
  );
}
