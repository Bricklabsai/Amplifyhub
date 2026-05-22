"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  HiArrowRight,
  HiCalendar,
  HiChevronRight,
  HiMail,
  HiPlus,
  HiSparkles,
  HiTemplate,
  HiTrendingUp,
  HiUsers,
} from "react-icons/hi";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import AIComposerTab from "@/components/email-hub/AIComposerTab";
import CampaignsTab from "@/components/email-hub/CampaignsTab";
import ScheduledTab from "@/components/email-hub/ScheduledTab";
import TemplatesTab from "@/components/email-hub/TemplatesTab";

type EmailStats = {
  lastSentAt: string | null;
  avgOpenRate: number;
  campaignCount: number;
} | null;

type Group = {
  id: string;
  name: string;
  description?: string;
  _count: { contacts: number };
  emailStats: EmailStats;
};

const HUB_TABS = [
  { value: "overview", label: "Overview" },
  { value: "audience", label: "Audience" },
  { value: "campaigns", label: "Campaigns" },
  { value: "scheduled", label: "Scheduled" },
  { value: "templates", label: "Templates" },
  { value: "studio", label: "AI Studio" },
] as const;

type HubTab = (typeof HUB_TABS)[number]["value"];

function isHubTab(value: string | null): value is HubTab {
  return Boolean(value && HUB_TABS.some((tab) => tab.value === value));
}

function StatItem({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof HiUsers;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="border-b border-gray-100 pb-4 last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7331FF]/10">
          <Icon className="text-lg text-[#7331FF]" />
        </div>
        <div>
          <div className="text-2xl font-black text-gray-900">{value}</div>
          <div className="text-sm font-semibold text-gray-900">{label}</div>
          <div className="text-xs text-gray-500">{description}</div>
        </div>
      </div>
    </div>
  );
}

function AudienceListItem({ group }: { group: Group }) {
  return (
    <div className="flex flex-col border-b border-gray-100 py-5 last:border-0 md:flex-row md:items-center md:justify-between">
      <div className="mb-3 flex-1 md:mb-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-gray-900">{group.name}</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {group._count?.contacts || 0} contacts
          </span>
        </div>
        {group.description && (
          <p className="mt-1 text-sm text-gray-500">{group.description}</p>
        )}
        {group.emailStats && (
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <span className="text-gray-500">
              Campaigns:{" "}
              <span className="font-medium text-gray-800">
                {group.emailStats.campaignCount}
              </span>
            </span>
            <span className="text-gray-500">
              Avg open rate:{" "}
              <span className="font-medium text-[#7331FF]">
                {(group.emailStats.avgOpenRate * 100).toFixed(1)}%
              </span>
            </span>
            {group.emailStats.lastSentAt && (
              <span className="text-gray-500">
                Last sent:{" "}
                <span className="font-medium text-gray-700">
                  {formatDate(group.emailStats.lastSentAt)}
                </span>
              </span>
            )}
          </div>
        )}
        {!group.emailStats && (
          <p className="mt-2 text-xs text-gray-400">
            No campaigns sent to this group yet
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          asChild
          variant="outline"
          className="h-9 rounded-lg border-gray-200 bg-white px-3 text-sm"
        >
          <Link href={`/email-hub?tab=campaigns&groupId=${group.id}`}>
            Send campaign
            <HiChevronRight className="ml-1 text-sm" />
          </Link>
        </Button>
        <Button
          asChild
          className="h-9 rounded-lg border-0 brand-gradient-bg px-3 text-sm text-white hover:opacity-90"
        >
          <Link href="/audience">
            Manage
            <HiArrowRight className="ml-1 text-sm" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function EmailHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<HubTab>(
    isHubTab(initialTab) ? initialTab : "overview"
  );
  const [groups, setGroups] = useState<Group[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchAudience();
    void fetchRecentCampaigns();
  }, []);

  useEffect(() => {
    const nextTab = searchParams.get("tab");
    if (isHubTab(nextTab) && nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, searchParams]);

  async function fetchAudience() {
    setLoading(true);
    const res = await fetch("/api/audience");
    if (res.ok) {
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }

  async function fetchRecentCampaigns() {
    const res = await fetch("/api/email-campaigns");
    if (res.ok) {
      const data = await res.json();
      setRecentCampaigns(Array.isArray(data) ? data.slice(0, 5) : []);
    }
  }

  function handleTabChange(value: string) {
    if (!isHubTab(value)) return;

    setActiveTab(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    if (value !== "campaigns") {
      params.delete("groupId");
    }
    router.replace(`/email-hub?${params.toString()}`, { scroll: false });
  }

  const summary = useMemo(() => {
    const totalContacts = groups.reduce(
      (sum, group) => sum + (group._count?.contacts || 0),
      0
    );
    const totalCampaigns = groups.reduce(
      (sum, group) => sum + (group.emailStats?.campaignCount || 0),
      0
    );
    const activeGroups = groups.filter(
      (group) => (group._count?.contacts || 0) > 0
    ).length;
    const avgOpenRate =
      groups
        .filter(
          (group) => group.emailStats && group.emailStats.avgOpenRate > 0
        )
        .reduce(
          (sum, group) => sum + (group.emailStats?.avgOpenRate || 0),
          0
        ) /
      Math.max(
        1,
        groups.filter((group) => group.emailStats && group.emailStats.avgOpenRate > 0)
          .length
      );

    return {
      totalContacts,
      totalCampaigns,
      activeGroups,
      avgOpenRate,
    };
  }, [groups]);

  const selectedGroupId = searchParams.get("groupId") || undefined;
  const selectedGroup = selectedGroupId
    ? groups.find((group) => group.id === selectedGroupId)
    : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:py-8">
      {/* Hero Section - Full width, no card */}
      <div className="mb-8 border-b border-gray-100 pb-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1
              className="text-3xl font-black tracking-tight text-gray-900 md:text-4xl"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Email Hub
            </h1>
            <p className="mt-2 text-gray-600">
              Manage your audience, create campaigns, and refine copy with AI.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => handleTabChange("campaigns")}
              className="h-10 rounded-xl border-0 brand-gradient-bg px-4 text-sm font-semibold text-white hover:opacity-90"
            >
              <HiPlus className="mr-2 text-base" />
              New campaign
            </Button>
            <Button
              variant="outline"
              onClick={() => handleTabChange("studio")}
              className="h-10 rounded-xl border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:border-[#7331FF]/30"
            >
              <HiSparkles className="mr-2 text-base text-[#7331FF]" />
              AI studio
            </Button>
          </div>
        </div>

        {/* Stats Row - Horizontal layout */}
        <div className="grid grid-cols-2 gap-6 gap-y-4 sm:grid-cols-4">
          <StatItem
            icon={HiUsers}
            label="Audience contacts"
            value={loading ? "..." : `${summary.totalContacts}`}
            description="All contacts across groups"
          />
          <StatItem
            icon={HiMail}
            label="Email campaigns"
            value={loading ? "..." : `${summary.totalCampaigns}`}
            description="Campaign activity"
          />
          <StatItem
            icon={HiCalendar}
            label="Automations"
            value={loading ? "..." : `${groups.length}`}
            description="Saved audience groups"
          />
          <StatItem
            icon={HiTrendingUp}
            label="Avg open rate"
            value={
              loading ? "..." : `${(summary.avgOpenRate * 100).toFixed(1)}%`
            }
            description="Based on performance data"
          />
        </div>
      </div>

      {/* Quick Actions - Inline section */}
      <div className="mb-8 rounded-2xl border border-[#7331FF]/10 bg-gradient-to-r from-[#7331FF]/5 to-[#FFC01E]/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <HiSparkles className="text-xl text-[#7331FF]" />
            <span className="font-semibold text-gray-900">Quick actions</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Create campaign", href: "/email-hub?tab=campaigns" },
              { label: "Design template", href: "/email-hub?tab=templates" },
              { label: "Schedule automation", href: "/email-hub?tab=scheduled" },
              { label: "AI compose", href: "/email-hub?tab=studio" },
              { label: "Import contacts", href: "/audience" },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="rounded-lg border border-transparent bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:border-[#7331FF]/20 hover:bg-[#7331FF]/10 hover:text-[#7331FF]"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-6 flex h-auto w-full flex-wrap gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1.5">
          {HUB_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-none transition-colors hover:bg-[#7331FF]/12 hover:text-[#7331FF] data-[state=active]:bg-[#7331FF] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:bg-transparent"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-8">
          {/* Two-column layout without cards */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left column - Audience list */}
            <div>
              <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-2">
                <h2
                  className="text-lg font-bold text-gray-900"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Audience snapshot
                </h2>
                <Button
                  variant="link"
                  asChild
                  className="text-sm text-[#7331FF]"
                >
                  <Link href="/audience">
                    View all
                    <HiChevronRight className="ml-1 text-sm" />
                  </Link>
                </Button>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className="h-24 animate-pulse rounded-lg bg-gray-50"
                    />
                  ))}
                </div>
              ) : groups.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
                  <HiUsers className="mx-auto mb-2 text-3xl text-gray-300" />
                  <p className="font-semibold text-gray-700">
                    No audience groups yet
                  </p>
                  <p className="text-sm text-gray-500">
                    Create groups and import contacts to start segmenting.
                  </p>
                </div>
              ) : (
                <div>
                  {groups.slice(0, 4).map((group) => (
                    <AudienceListItem key={group.id} group={group} />
                  ))}
                </div>
              )}
            </div>

            {/* Right column - Flow and Focus */}
            <div className="space-y-6">
              <div>
                <h2
                  className="mb-4 border-b border-gray-100 pb-2 text-lg font-bold text-gray-900"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Recommended workflow
                </h2>
                <div className="space-y-2">
                  {[
                    "1. Build or import audience contacts",
                    "2. Create a reusable email template",
                    "3. Draft or enhance the copy with AI",
                    "4. Send a campaign or schedule automation",
                  ].map((step) => (
                    <div key={step} className="rounded-lg bg-gray-50 px-4 py-2 text-sm text-gray-700">
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[#7331FF]/10 bg-[#7331FF]/5 p-4">
                <h2
                  className="text-lg font-bold text-gray-900"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Current focus
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {selectedGroup ? (
                    <>
                      Preparing a campaign for{" "}
                      <span className="font-semibold text-gray-900">
                        {selectedGroup.name}
                      </span>
                      .
                    </>
                  ) : (
                    "Choose an audience group to prefill your next campaign."
                  )}
                </p>
                <div className="mt-3 flex gap-3">
                  <Button
                    asChild
                    className="rounded-lg brand-gradient-bg border-0 text-white hover:opacity-90"
                  >
                    <Link href="/email-hub?tab=campaigns">Open campaigns</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-lg border-gray-200"
                  >
                    <Link href="/email-hub?tab=studio">Open AI studio</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Campaigns */}
          {recentCampaigns.length > 0 && (
            <div>
              <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-2">
                <h2
                  className="text-lg font-bold text-gray-900"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Recent campaigns
                </h2>
                <Button
                  variant="link"
                  onClick={() => handleTabChange("campaigns")}
                  className="text-sm text-[#7331FF]"
                >
                  View all
                  <HiChevronRight className="ml-1 text-sm" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {recentCampaigns.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                  >
                    <p className="truncate text-sm font-bold text-gray-900">
                      {c.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-gray-500">
                      {c.subject}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        {c.status}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatDate(c.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="audience" className="mt-0">
          <div>
            <div className="mb-4 flex flex-col gap-3 border-b border-gray-100 pb-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2
                  className="text-lg font-bold text-gray-900"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Audience
                </h2>
                <p className="text-sm text-gray-500">
                  Manage contact groups and move straight into campaigns.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="rounded-lg border-gray-200"
                >
                  <Link href="/audience">Open full audience manager</Link>
                </Button>
                <Button
                  onClick={() => handleTabChange("campaigns")}
                  className="rounded-lg brand-gradient-bg border-0 text-white hover:opacity-90"
                >
                  Start a campaign
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((index) => (
                  <div
                    key={index}
                    className="h-24 animate-pulse rounded-lg bg-gray-50"
                  />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-6 py-14 text-center">
                <HiUsers className="mx-auto mb-2 text-4xl text-gray-300" />
                <p className="font-semibold text-gray-700">
                  No groups available
                </p>
                <p className="text-sm text-gray-500">
                  Create groups in the audience section to organize contacts.
                </p>
              </div>
            ) : (
              <div>
                {groups.map((group) => (
                  <AudienceListItem key={group.id} group={group} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-0">
          <div>
            <div className="mb-4 flex flex-col gap-3 border-b border-gray-100 pb-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2
                  className="text-lg font-bold text-gray-900"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Campaigns
                </h2>
                <p className="text-sm text-gray-500">
                  Create and send email campaigns from one place.
                </p>
                {selectedGroup && (
                  <p className="mt-1 text-xs font-medium text-[#7331FF]">
                    Preselected audience group: {selectedGroup.name}
                  </p>
                )}
              </div>
              <Button
                asChild
                className="rounded-lg brand-gradient-bg border-0 text-white hover:opacity-90"
              >
                <Link href="/audience">
                  Pick audience
                  <HiChevronRight className="ml-1 text-sm" />
                </Link>
              </Button>
            </div>
            <CampaignsTab preselectedGroupId={selectedGroupId} />
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="mt-0">
          <div>
            <div className="mb-4 border-b border-gray-100 pb-2">
              <h2
                className="text-lg font-bold text-gray-900"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Scheduled
              </h2>
              <p className="text-sm text-gray-500">
                Automate newsletters, event messages, and recurring campaigns.
              </p>
            </div>
            <ScheduledTab />
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <div>
            <div className="mb-4 border-b border-gray-100 pb-2">
              <h2
                className="text-lg font-bold text-gray-900"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Templates
              </h2>
              <p className="text-sm text-gray-500">
                Save reusable layouts for faster campaign creation.
              </p>
            </div>
            <TemplatesTab />
          </div>
        </TabsContent>

        <TabsContent value="studio" className="mt-0">
          <AIComposerTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}