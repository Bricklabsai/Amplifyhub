"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefs,
} from "@/lib/notification-prefs";

type TeamInfo = {
  id: string;
  name: string;
  owner: { name: string | null; email: string };
  members: { name: string | null; email: string; role: string }[];
  pendingInvites: { email: string; role: string }[];
};

type RosterRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Invited";
};

const ROLE_STYLES: Record<string, string> = {
  Owner: "bg-[#7331FF]/10 text-[#7331FF]",
  ADMIN: "bg-amber-100 text-amber-800",
  EDITOR: "bg-blue-100 text-blue-800",
  VIEWER: "bg-gray-100 text-gray-700",
  Invited: "bg-slate-100 text-slate-600",
};

function roleLabel(role: string, status: RosterRow["status"]) {
  if (status === "Invited") return "Invited";
  if (role === "ADMIN") return "Admin";
  if (role === "EDITOR") return "Editor";
  if (role === "VIEWER") return "Viewer";
  return role;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [notifications, setNotifications] =
    useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [teamData, setTeamData] = useState<{ team: TeamInfo | null } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const [prefsRes, teamRes] = await Promise.all([
        fetch("/api/user/settings"),
        fetch("/api/user/team"),
      ]);
      if (prefsRes.ok) {
        const data = await prefsRes.json();
        setNotifications({ ...DEFAULT_NOTIFICATION_PREFS, ...data.notifications });
      }
      if (teamRes.ok) {
        setTeamData(await teamRes.json());
      }
    } finally {
      setLoading(false);
    }
  }

  const roster = useMemo((): RosterRow[] => {
    const team = teamData?.team;
    if (!team) return [];

    const rows: RosterRow[] = [
      {
        id: "owner",
        name: team.owner.name || "Organization owner",
        email: team.owner.email,
        role: "Owner",
        status: "Active",
      },
      ...team.members.map((m, i) => ({
        id: `member-${i}`,
        name: m.name || m.email,
        email: m.email,
        role: m.role,
        status: "Active" as const,
      })),
      ...team.pendingInvites.map((inv, i) => ({
        id: `invite-${i}`,
        name: inv.email,
        email: inv.email,
        role: inv.role,
        status: "Invited" as const,
      })),
    ];

    return rows;
  }, [teamData]);

  async function saveNotifications() {
    setSavingNotifs(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Notification preferences saved" });
    } catch {
      toast({ title: "Could not save preferences", variant: "destructive" });
    } finally {
      setSavingNotifs(false);
    }
  }

  async function deleteAccount() {
    if (
      !confirm(
        "This permanently deletes your account and all associated data. This cannot be undone."
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmEmail,
          password: deletePassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete account");
      }
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  const team = teamData?.team;

  if (loading) {
    return (
      <div className="-m-4 min-h-[calc(100vh-4rem)] animate-pulse bg-gray-50/50 md:-m-6">
        <div className="h-28 bg-gray-100" />
        <div className="space-y-4 p-6 md:p-10">
          <div className="h-48 bg-gray-100" />
          <div className="h-64 bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="-m-4 min-h-[calc(100vh-4rem)] bg-gray-50/40 md:-m-6">
      <div className="border-b border-gray-100 bg-white px-6 py-8 md:px-10">
        <div className="mx-auto max-w-5xl">
          <h1
            className="text-2xl font-black text-gray-900 md:text-3xl"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Settings
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            View your organization roster, control in-app notifications, and
            manage account-level options.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl">
        {/* Organization */}
        <section className="border-b border-gray-200 bg-white px-6 py-8 md:px-10">
          <h2
            className="text-lg font-bold text-gray-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Organization
          </h2>
          {team ? (
            <>
              <p className="mt-1 text-sm text-gray-500">
                <span className="font-medium text-gray-800">{team.name}</span>
                {team.owner.email === session?.user?.email && (
                  <span className="ml-2 text-[#7331FF]">· You own this organization</span>
                )}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                People with access to this workspace and their roles.
              </p>

              <div className="mt-6 overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Name</th>
                      <th className="hidden px-4 py-3 sm:table-cell">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((row) => {
                      const badgeKey = roleLabel(row.role, row.status);
                      const badgeClass =
                        ROLE_STYLES[badgeKey] || ROLE_STYLES.VIEWER;
                      return (
                        <tr
                          key={row.id}
                          className="border-b border-gray-100 last:border-0"
                        >
                          <td className="px-4 py-3.5 font-medium text-gray-900">
                            {row.name}
                            <span className="mt-0.5 block text-xs font-normal text-gray-500 sm:hidden">
                              {row.email}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3.5 text-gray-600 sm:table-cell">
                            {row.email}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}
                            >
                              {badgeKey}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right text-xs text-gray-500">
                            {row.status}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-gray-500">
              You are not linked to an organization yet. When you join or create
              one, members and invites will appear here.
            </p>
          )}
        </section>

        {/* Notifications */}
        <section className="border-b border-gray-200 px-6 py-8 md:px-10">
          <h2
            className="text-lg font-bold text-gray-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Notifications
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Choose what appears in your notification bell.
          </p>
          <ul className="mt-6 divide-y divide-gray-100">
            {[
              {
                key: "email" as const,
                label: "Email notifications",
                desc: "Important updates sent to your inbox",
              },
              {
                key: "post_published" as const,
                label: "Post published",
                desc: "When a post is published or a scheduled post goes live",
              },
              {
                key: "post_engagement" as const,
                label: "Post engagement",
                desc: "New likes or comments on published posts",
              },
              {
                key: "campaign_started" as const,
                label: "Campaign updates",
                desc: "When email campaigns start or finish",
              },
              {
                key: "billing" as const,
                label: "Billing & payments",
                desc: "Payment success or failure on your account",
              },
              {
                key: "ai_credits_low" as const,
                label: "AI credits low",
                desc: "When usage reaches 80% or your plan limit",
              },
              {
                key: "weekly_report" as const,
                label: "Weekly report",
                desc: "Performance summary each week",
              },
            ].map(({ key, label, desc }) => (
              <li
                key={key}
                className="flex items-center justify-between gap-4 py-4 first:pt-0"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <Switch
                  checked={notifications[key]}
                  onCheckedChange={(checked) =>
                    setNotifications((n) => ({ ...n, [key]: checked }))
                  }
                />
              </li>
            ))}
          </ul>
          <Button
            onClick={saveNotifications}
            disabled={savingNotifs}
            className="mt-6 h-11 brand-gradient-bg rounded-xl border-0 px-8 text-sm font-semibold text-white hover:opacity-90"
          >
            {savingNotifs ? "Saving…" : "Save preferences"}
          </Button>
        </section>

        {/* Delete account */}
        <section className="bg-red-50/80 px-6 py-8 md:px-10">
          <h2
            className="text-lg font-bold text-red-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Delete account
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-red-800/90">
            Permanently remove your account, posts, campaigns, and data. Type your
            email below to confirm.
          </p>
          <div className="mt-6 grid max-w-xl gap-4">
            <div>
              <Label className="mb-2 block text-sm font-semibold text-red-900">
                Confirm email
              </Label>
              <Input
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={session?.user?.email || "your@email.com"}
                className="h-11 rounded-xl border-red-200 bg-white text-black"
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-semibold text-red-900">
                Password (email login only)
              </Label>
              <Input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Leave blank if you use Google sign-in"
                className="h-11 rounded-xl border-red-200 bg-white"
              />
            </div>
            <Button
              onClick={deleteAccount}
              disabled={deleting || !confirmEmail.trim()}
              variant="destructive"
              className="h-11 w-fit rounded-xl font-semibold"
            >
              {deleting ? "Deleting…" : "Delete my account"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
