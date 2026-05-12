"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { HiSparkles, HiHome, HiPencil, HiCollection, HiShare, HiFlag, HiUsers, HiMail, HiPhotograph, HiChartBar, HiCreditCard, HiCog, HiShieldCheck, HiLogout, HiUserGroup, HiX } from "react-icons/hi";
import { cn } from "@/lib/utils";
import { HiArrowPath } from "react-icons/hi2";

const NAV_ITEMS = [
  { href: "/dashboard", icon: HiHome, label: "Dashboard" },
  { href: "/compose", icon: HiPencil, label: "Compose" },
  { href: "/posts", icon: HiCollection, label: "Posts" },
  { href: "/social-accounts", icon: HiShare, label: "Social Accounts" },
  { href: "/campaigns", icon: HiFlag, label: "Campaigns" },
  { href: "/audience", icon: HiUsers, label: "Audience" },
  { href: "/team", icon: HiUserGroup, label: "Team" },
  { href: "/email-campaigns", icon: HiMail, label: "Email Campaigns" },
  { href: "/email-templates", icon: HiSparkles, label: "Email Templates" },
  { href: "/email-composer", icon: HiSparkles, label: "AI Email Composer" },
  { href: "/scheduled-campaigns", icon: HiArrowPath, label: "Scheduled Campaigns" },
  { href: "/ai-studio", icon: HiPhotograph, label: "AI Studio" },
  { href: "/analytics", icon: HiChartBar, label: "Analytics" },
  { href: "/billing", icon: HiCreditCard, label: "Billing" },
  { href: "/settings", icon: HiCog, label: "Settings" },
];

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  return (
    <aside className={cn(
      "sidebar-gradient w-64 flex-shrink-0 flex flex-col h-full shadow-2xl transition-all duration-300 fixed md:relative z-[60] md:z-0",
      isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
    )}>
      {/* Logo */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div>
            <span className="text-white font-black text-lg block leading-tight">
              Amplify<span style={{ background: "linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Hub</span>
            </span>
            <span className="text-white/40 text-xs">AI Platform</span>
          </div>
        </Link>
        <button onClick={onClose} className="md:hidden p-2 text-white/50 hover:text-white transition-colors">
          <HiX className="text-xl" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => {
                if (window.innerWidth < 768) onClose();
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group text-sm",
                active
                  ? "bg-white/10 text-white sidebar-item-active"
                  : "text-white/50 hover:bg-white/5 hover:text-white/80"
              )}
            >
              <Icon className={cn("text-lg flex-shrink-0", active ? "text-violet-300" : "text-white/40 group-hover:text-white/60")} />
              <span className="font-medium">{label}</span>
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />}
            </Link>
          );
        })}

        {/* Admin Section */}
        {isAdmin && (
          <>
            <div className="pt-4 pb-1">
              <p className="text-white/20 text-xs font-semibold uppercase tracking-wider px-3">Admin</p>
            </div>
            <Link
              href="/admin"
              onClick={() => {
                if (window.innerWidth < 768) onClose();
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm",
                pathname === "/admin"
                  ? "bg-white/10 text-white sidebar-item-active"
                  : "text-white/50 hover:bg-white/5 hover:text-white/80"
              )}
            >
              <HiShieldCheck className="text-lg text-amber-400 flex-shrink-0" />
              <span className="font-medium">Admin Panel</span>
            </Link>
          </>
        )}
      </nav>

      {/* User + Signout */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 mb-2">
          <div className="w-8 h-8 rounded-full brand-gradient-bg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {session?.user?.name?.[0]?.toUpperCase() || "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{session?.user?.name || "User"}</p>
            <p className="text-white/40 text-xs truncate">{session?.user?.email}</p>
          </div>
          {isAdmin && <span className="text-xs text-amber-400 font-medium">Admin</span>}
        </div>
        <button
          onClick={() => {
            if (window.innerWidth < 768) onClose();
            signOut({ callbackUrl: "/" });
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:bg-white/5 hover:text-white/80 transition-all text-sm"
        >
          <HiLogout className="text-lg" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
