"use client";

import Link from "next/link";
import { HiArrowRight, HiLockClosed } from "react-icons/hi";
import { cn } from "@/lib/utils";

export type ActivityPreviewItem = {
  id?: string;
  content?: string;
  title?: string;
  message?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  unreadCount?: number;
  type?: string;
  read?: boolean;
};

export function ActivityCard({
  title,
  description,
  count,
  countLabel,
  href,
  icon: Icon,
  accentColor,
  preview,
  locked,
  lockedMessage,
  premiumBadge,
  children,
}: {
  title: string;
  description: string;
  count: number | string;
  countLabel?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  preview?: ActivityPreviewItem[];
  locked?: boolean;
  lockedMessage?: string;
  premiumBadge?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "group flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:border-violet-100 hover:shadow-md",
        locked && "opacity-95"
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-gray-50 p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ background: `${accentColor}18` }}
          >
            <span style={{ color: accentColor }}>
              <Icon className="text-xl" />
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className="font-bold text-gray-900"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {title}
              </h3>
              {premiumBadge && (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                  Pro
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-500">{description}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div
            className="text-2xl font-black leading-none text-gray-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {count}
          </div>
          {countLabel && (
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
              {countLabel}
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 p-5">
        {locked ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gray-50 py-8 text-center">
            <HiLockClosed className="text-2xl text-gray-300" />
            <p className="max-w-[200px] text-xs text-gray-500">
              {lockedMessage || "Upgrade to unlock this feature"}
            </p>
            <Link
              href="/billing"
              className="text-xs font-semibold text-violet-600 hover:text-violet-700"
            >
              View plans →
            </Link>
          </div>
        ) : (
          <>
            {children}
            {preview && preview.length > 0 ? (
              <ul className="space-y-2.5">
                {preview.map((item, i) => (
                  <li
                    key={item.id || i}
                    className="rounded-lg bg-gray-50/80 px-3 py-2 text-xs text-gray-700"
                  >
                    <p className="line-clamp-2 leading-relaxed">
                      {item.content || item.title || item.message || item.type}
                    </p>
                    {(item.likes !== undefined ||
                      item.comments !== undefined ||
                      item.unreadCount !== undefined) && (
                      <p className="mt-1 text-[10px] font-medium text-gray-400">
                        {item.likes !== undefined &&
                          `${item.likes} likes · ${item.comments} comments`}
                        {item.unreadCount !== undefined &&
                          item.unreadCount > 0 &&
                          `${item.unreadCount} unread`}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-xs text-gray-400">Nothing here yet</p>
            )}
          </>
        )}
      </div>

      <div className="border-t border-gray-50 px-5 py-3">
        {locked ? (
          <Link
            href="/billing"
            className="flex items-center justify-center gap-1 text-sm font-semibold text-violet-600 transition-colors hover:text-violet-700"
          >
            Upgrade to unlock
            <HiArrowRight className="text-sm" />
          </Link>
        ) : (
          <Link
            href={href}
            className="flex items-center justify-center gap-1 text-sm font-semibold text-violet-600 transition-colors hover:text-violet-700"
          >
            View All
            <HiArrowRight className="text-sm transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
