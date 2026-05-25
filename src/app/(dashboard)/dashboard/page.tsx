"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  HiSparkles,
  HiDocumentText,
  HiClock,
  HiPencil,
  HiCollection,
  HiBell,
  HiHeart,
  HiChat,
  HiInbox,
} from "react-icons/hi";
import { DashboardStatsRow } from "@/components/dashboard/DashboardStatsRow";
import { ActivityCard } from "@/components/dashboard/ActivityCard";
import { ContentCalendar, type CalendarEvent } from "@/components/dashboard/ContentCalendar";

type DashboardData = {
  stats: {
    totalFollowers: number;
    totalPosts: number;
    publishedCount: number;
    scheduledPosts: number;
    socialAccounts: number;
  };
  subscription: { isPaid: boolean; planName: string };
  activities: Record<string, any>;
  calendarEvents: CalendarEvent[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      </div>
    );
  }

  const { stats, subscription, activities, calendarEvents } = data || {};
  const isPaid = subscription?.isPaid ?? false;
  const a = activities || {};

  return (
    <div className="max-w-7xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2
            className="text-2xl font-bold text-gray-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Welcome back
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Your content hub — manage posts, engagement, and messages in one place.
            {!isPaid && (
              <span className="ml-1 text-violet-600">
                Upgrade for advanced engagement &amp; messaging.
              </span>
            )}
          </p>
        </div>
        <Link href="/compose">
          <button
            type="button"
            className="brand-gradient-bg flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90"
          >
            <HiSparkles className="text-base" />
            New Post
          </button>
        </Link>
      </div>

      <DashboardStatsRow
        stats={{
          totalFollowers: stats?.totalFollowers ?? 0,
          totalPosts: stats?.publishedCount ?? 0,
          scheduledPosts: stats?.scheduledPosts ?? 0,
          socialAccounts: stats?.socialAccounts ?? 0,
        }}
      />

      <section>
        <h3
          className="mb-4 text-lg font-bold text-gray-900"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Platform Activity
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ActivityCard
            title="Published Posts"
            description="Live across your connected accounts"
            count={a.published?.count ?? 0}
            href={a.published?.href ?? "/posts?status=PUBLISHED"}
            icon={HiDocumentText}
            accentColor="#059669"
            preview={a.published?.preview}
          />
          <ActivityCard
            title="Scheduled Posts"
            description="Upcoming publishes"
            count={a.scheduled?.count ?? 0}
            href={a.scheduled?.href ?? "/posts?status=SCHEDULED"}
            icon={HiClock}
            accentColor="#2563eb"
            preview={a.scheduled?.preview}
          />
          <ActivityCard
            title="Drafts"
            description="Work in progress"
            count={a.drafts?.count ?? 0}
            href={a.drafts?.href ?? "/posts?status=DRAFT"}
            icon={HiPencil}
            accentColor="#6b7280"
            preview={a.drafts?.preview}
          />
          <ActivityCard
            title="Queued Posts"
            description="Due now or processing"
            count={a.queued?.count ?? 0}
            countLabel="in queue"
            href={a.queued?.href ?? "/posts?status=queued"}
            icon={HiCollection}
            accentColor="#d97706"
            preview={a.queued?.preview}
          />
          <ActivityCard
            title="Notifications"
            description="Alerts and updates"
            count={a.notifications?.count ?? 0}
            countLabel="unread"
            href={a.notifications?.href ?? "/posts/notifications"}
            icon={HiBell}
            accentColor="#7c3aed"
            preview={a.notifications?.preview?.map((n: { id: string; type: string; message?: string }) => ({
              id: n.id,
              content: n.message || n.type,
            }))}
          />
          <ActivityCard
            title="Engagements"
            description="Likes, comments, and shares"
            count={
              (a.engagements?.likes ?? 0) +
              (a.engagements?.comments ?? 0) +
              (a.engagements?.shares ?? 0)
            }
            countLabel="total interactions"
            href={a.engagements?.href ?? "/posts/engagements"}
            icon={HiHeart}
            accentColor="#db2777"
            locked={!isPaid}
            lockedMessage="Upgrade to view sentiment analysis, comment replies, and engagement insights."
            premiumBadge={isPaid}
            preview={isPaid ? a.engagements?.preview : undefined}
          >
            {isPaid && (
              <div className="mb-3 flex gap-3 text-xs font-medium text-gray-500">
                <span>{a.engagements?.likes ?? 0} likes</span>
                <span>{a.engagements?.comments ?? 0} comments</span>
                <span>{a.engagements?.shares ?? 0} shares</span>
              </div>
            )}
          </ActivityCard>
          <ActivityCard
            title="Messages"
            description="Direct messages from connected accounts"
            count={isPaid ? (a.messages?.count ?? 0) : "—"}
            countLabel={isPaid ? "unread" : undefined}
            href={a.messages?.href ?? "/posts/messages"}
            icon={HiChat}
            accentColor="#0891b2"
            locked={!isPaid}
            lockedMessage="Pro plans unlock unified inbox, DM replies, and conversation history."
            premiumBadge
            preview={isPaid ? a.messages?.preview : undefined}
          />
        </div>
      </section>

      <ContentCalendar events={calendarEvents ?? []} />

      {!isPaid && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-100 bg-violet-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <HiInbox className="text-2xl text-violet-600" />
            <div>
              <p className="font-semibold text-gray-900">Unlock advanced features</p>
              <p className="text-sm text-gray-600">
                Get engagement analytics, sentiment insights, and full messaging on Pro or
                Corporate.
              </p>
            </div>
          </div>
          <Link
            href="/billing"
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
          >
            View plans
          </Link>
        </div>
      )}
    </div>
  );
}
