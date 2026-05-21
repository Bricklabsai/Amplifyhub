"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HiArrowRight, HiCalendar, HiChevronRight, HiMail, HiPlus, HiSparkles, HiTemplate, HiTrendingUp, HiUsers } from "react-icons/hi";
import { Badge } from "@/components/ui/badge";
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

function StatCard({
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
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF1E8]">
        <Icon className="text-xl text-[#FF6B4A]" />
      </div>
      <div className="text-3xl font-black text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
        {value}
      </div>
      <div className="mt-1 text-sm font-semibold text-gray-900">{label}</div>
      <div className="mt-1 text-xs leading-relaxed text-gray-500">{description}</div>
    </div>
  );
}

function AudienceCard({ group }: { group: Group }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
            {group.name}
          </h3>
          {group.description && <p className="mt-1 line-clamp-2 text-sm text-gray-500">{group.description}</p>}
        </div>
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#FFF1E8]">
          <HiUsers className="text-lg text-[#FF6B4A]" />
        </div>
      </div>

      <div className="mb-4 flex items-baseline gap-2">
        <span className="text-4xl font-black text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
          {group._count?.contacts || 0}
        </span>
        <span className="text-sm text-gray-400">contacts</span>
      </div>

      {group.emailStats ? (
        <div className="mb-4 rounded-2xl bg-orange-50 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Campaigns sent</span>
            <span className="font-semibold text-gray-800">{group.emailStats.campaignCount}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-gray-500">Avg open rate</span>
            <span className="font-semibold text-[#D97706]">{(group.emailStats.avgOpenRate * 100).toFixed(1)}%</span>
          </div>
          {group.emailStats.lastSentAt && (
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-gray-500">Last sent</span>
              <span className="font-medium text-gray-700">{formatDate(group.emailStats.lastSentAt)}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-4 rounded-2xl bg-gray-50 p-3">
          <p className="text-xs text-gray-400">No campaigns sent to this group yet</p>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="outline" className="h-10 flex-1 rounded-xl border-gray-200 bg-white text-sm">
          <Link href={`/email-hub?tab=campaigns&groupId=${group.id}`}>
            Send campaign
            <HiChevronRight className="ml-1 text-sm" />
          </Link>
        </Button>
        <Button asChild className="h-10 flex-1 rounded-xl border-0 bg-[#FF6B4A] text-sm text-white hover:bg-[#FF5A35]">
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
  const [activeTab, setActiveTab] = useState<HubTab>(isHubTab(initialTab) ? initialTab : "overview");
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
    const totalContacts = groups.reduce((sum, group) => sum + (group._count?.contacts || 0), 0);
    const totalCampaigns = groups.reduce((sum, group) => sum + (group.emailStats?.campaignCount || 0), 0);
    const activeGroups = groups.filter((group) => (group._count?.contacts || 0) > 0).length;
    const avgOpenRate =
      groups.filter((group) => group.emailStats && group.emailStats.avgOpenRate > 0).reduce((sum, group) => sum + (group.emailStats?.avgOpenRate || 0), 0) /
      Math.max(1, groups.filter((group) => group.emailStats && group.emailStats.avgOpenRate > 0).length);

    return {
      totalContacts,
      totalCampaigns,
      activeGroups,
      avgOpenRate,
    };
  }, [groups]);

  const selectedGroupId = searchParams.get("groupId") || undefined;
  const selectedGroup = selectedGroupId ? groups.find((group) => group.id === selectedGroupId) : undefined;

  return (
    <div className="space-y-6 max-w-7xl">
      <section className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.9fr] lg:p-8">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border-0 bg-[#FFF1E8] px-3 py-1 text-xs font-semibold text-[#C2410C]">
                Unified Email Hub
              </Badge>
              <Badge variant="outline" className="rounded-full border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600">
                Audience + Campaigns + Studio
              </Badge>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight text-gray-900 md:text-5xl" style={{ fontFamily: "Outfit, sans-serif" }}>
                Everything email in one clean workspace.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-gray-600 md:text-base">
                Manage your audience, create campaigns, build templates, automate sends, and refine copy with AI without jumping between screens.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => handleTabChange("campaigns")}
                className="h-11 rounded-xl border-0 bg-[#FF6B4A] px-5 text-sm font-semibold text-white hover:bg-[#FF5A35]"
              >
                <HiPlus className="mr-2 text-base" />
                New campaign
              </Button>
              <Button
                variant="outline"
                onClick={() => handleTabChange("studio")}
                className="h-11 rounded-xl border-gray-200 px-5 text-sm font-semibold text-gray-700"
              >
                <HiSparkles className="mr-2 text-base text-[#FF6B4A]" />
                AI studio
              </Button>
              <Button asChild variant="ghost" className="h-11 rounded-xl px-5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                <Link href="/audience">
                  <HiUsers className="mr-2 text-base" />
                  Manage audience
                </Link>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={HiUsers}
                label="Audience contacts"
                value={loading ? "..." : `${summary.totalContacts}`}
                description="All contacts across your groups"
              />
              <StatCard
                icon={HiMail}
                label="Email campaigns"
                value={loading ? "..." : `${summary.totalCampaigns}`}
                description="Campaign activity in your audience segments"
              />
              <StatCard
                icon={HiCalendar}
                label="Automations"
                value={loading ? "..." : `${groups.length}`}
                description="Saved audience groups and follow-up flows"
              />
              <StatCard
                icon={HiTrendingUp}
                label="Avg open rate"
                value={loading ? "..." : `${(summary.avgOpenRate * 100).toFixed(1)}%`}
                description="Based on groups with performance data"
              />
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-orange-100 bg-[#FFF9F4] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Quick actions</p>
                <p className="text-xs text-gray-500">Fast access to common tasks</p>
              </div>
              <HiSparkles className="text-2xl text-[#FF6B4A]" />
            </div>

            <div className="space-y-3">
              {[
                { label: "Create email campaign", href: "/email-hub?tab=campaigns", hint: "Pick a group and send now" },
                { label: "Design template", href: "/email-hub?tab=templates", hint: "Reusable email layouts" },
                { label: "Schedule automation", href: "/email-hub?tab=scheduled", hint: "Recurring emails and sequences" },
                { label: "AI compose email", href: "/email-hub?tab=studio", hint: "Generate and refine copy" },
                { label: "Import contacts", href: "/audience", hint: "Grow and segment your audience" },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 transition-all hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{action.label}</p>
                    <p className="text-xs text-gray-500">{action.hint}</p>
                  </div>
                  <HiChevronRight className="text-gray-300" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-[1.5rem] bg-white p-2 shadow-sm md:grid-cols-6">
          {HUB_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-xl px-4 py-3 text-sm font-semibold data-[state=active]:bg-[#FF6B4A] data-[state=active]:text-white"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Audience snapshot
                  </h2>
                  <p className="text-sm text-gray-500">A quick look at your most active segments.</p>
                </div>
                <Button variant="outline" asChild className="rounded-xl border-gray-200">
                  <Link href="/audience">
                    View all
                    <HiChevronRight className="ml-1 text-sm" />
                  </Link>
                </Button>
              </div>

              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3].map((index) => (
                    <div key={index} className="h-52 animate-pulse rounded-3xl border border-gray-100 bg-gray-50" />
                  ))}
                </div>
              ) : groups.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-14 text-center">
                  <HiUsers className="mx-auto mb-3 text-5xl text-gray-300" />
                  <p className="font-semibold text-gray-700">No audience groups yet</p>
                  <p className="mt-1 text-sm text-gray-500">Create groups and import contacts to start segmenting your emails.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {groups.slice(0, 6).map((group) => (
                    <AudienceCard key={group.id} group={group} />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Recommended flow
                </h2>
                <div className="mt-4 space-y-3">
                  {[
                    "1. Build or import audience contacts",
                    "2. Create a reusable email template",
                    "3. Draft or enhance the copy with AI",
                    "4. Send a campaign or schedule automation",
                  ].map((step) => (
                    <div key={step} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-gray-200 bg-[#FFF9F4] p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Current focus
                </h2>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  {selectedGroup ? (
                    <>
                      Preparing a campaign for <span className="font-semibold text-gray-900">{selectedGroup.name}</span>.
                    </>
                  ) : (
                    "Choose an audience group to prefill your next campaign."
                  )}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild className="rounded-xl bg-[#FF6B4A] text-white hover:bg-[#FF5A35]">
                    <Link href="/email-hub?tab=campaigns">Open campaigns</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl border-gray-200">
                    <Link href="/email-hub?tab=studio">Open AI studio</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {recentCampaigns.length > 0 && (
            <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Recent campaigns
                  </h2>
                  <p className="text-sm text-gray-500">The latest performance of your email sends.</p>
                </div>
                <Button variant="outline" onClick={() => handleTabChange("campaigns")} className="rounded-xl border-gray-200">
                  View all
                  <HiChevronRight className="ml-1 text-sm" />
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {recentCampaigns.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="truncate text-sm font-bold text-gray-900">{c.name}</p>
                    <p className="mt-1 truncate text-xs text-gray-500">{c.subject}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge className="bg-emerald-100 text-[10px] text-emerald-700 border-0">{c.status}</Badge>
                      <span className="text-[10px] text-gray-400">{formatDate(c.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="audience" className="mt-6">
          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Audience
                </h2>
                <p className="text-sm text-gray-500">Manage contact groups and move straight into campaigns.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="rounded-xl border-gray-200">
                  <Link href="/audience">Open full audience manager</Link>
                </Button>
                <Button onClick={() => handleTabChange("campaigns")} className="rounded-xl bg-[#FF6B4A] text-white hover:bg-[#FF5A35]">
                  Start a campaign
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4].map((index) => (
                  <div key={index} className="h-52 animate-pulse rounded-3xl border border-gray-100 bg-gray-50" />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-14 text-center">
                <HiUsers className="mx-auto mb-3 text-5xl text-gray-300" />
                <p className="font-semibold text-gray-700">No groups available</p>
                <p className="mt-1 text-sm text-gray-500">Create groups in the audience section to organize contacts.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {groups.map((group) => (
                  <AudienceCard key={group.id} group={group} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Campaigns
                </h2>
                <p className="text-sm text-gray-500">Create and send email campaigns from one place.</p>
                {selectedGroup && (
                  <p className="mt-1 text-xs font-medium text-[#C2410C]">
                    Preselected audience group: {selectedGroup.name}
                  </p>
                )}
              </div>
              <Button asChild className="rounded-xl bg-[#FF6B4A] text-white hover:bg-[#FF5A35]">
                <Link href="/audience">
                  Pick audience
                  <HiChevronRight className="ml-1 text-sm" />
                </Link>
              </Button>
            </div>
            <CampaignsTab preselectedGroupId={selectedGroupId} />
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="mt-6">
          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                Scheduled
              </h2>
              <p className="text-sm text-gray-500">Automate newsletters, event messages, and recurring campaigns.</p>
            </div>
            <ScheduledTab />
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                Templates
              </h2>
              <p className="text-sm text-gray-500">Save reusable layouts for faster campaign creation.</p>
            </div>
            <TemplatesTab />
          </div>
        </TabsContent>

        <TabsContent value="studio" className="mt-6">
          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  AI Studio
                </h2>
                <p className="text-sm text-gray-500">Write, improve, and refine email copy with AI assistance.</p>
              </div>
              <Button asChild variant="outline" className="rounded-xl border-gray-200">
                <Link href="/email-composer">Open dedicated composer</Link>
              </Button>
            </div>
            <AIComposerTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
