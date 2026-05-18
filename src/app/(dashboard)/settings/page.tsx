"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { HiCog, HiBell, HiKey, HiShieldCheck } from "react-icons/hi";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState({
    email: true,
    post_published: true,
    campaign_started: true,
    ai_credits_low: true,
    weekly_report: false,
  });
  const [saved, setSaved] = useState(false);

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile Settings */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <HiCog className="text-violet-500 text-xl" />
          <h3 className="font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>Profile Settings</h3>
        </div>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl brand-gradient-bg flex items-center justify-center text-white text-2xl font-black">
            {session?.user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <p className="font-bold text-gray-900">{session?.user?.name}</p>
            <p className="text-sm text-gray-500">{session?.user?.email}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Display Name</Label>
             <Input defaultValue={session?.user?.name || ""} className="rounded-xl border-gray-200 h-11 text-foreground" />
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Email Address</Label>
             <Input defaultValue={session?.user?.email || ""} type="email" disabled className="rounded-xl border-gray-200 h-11 opacity-60 text-foreground" />
          </div>
          <Button onClick={save} className="brand-gradient-bg text-white border-0 hover:opacity-90 rounded-xl px-6 h-10 font-semibold text-sm">
            {saved ? "✓ Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <HiBell className="text-violet-500 text-xl" />
          <h3 className="font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>Notification Preferences</h3>
        </div>
        <div className="space-y-4">
          {[
            { key: "email", label: "Email Notifications", desc: "Receive notifications via email" },
            { key: "post_published", label: "Post Published", desc: "When your scheduled post goes live" },
            { key: "campaign_started", label: "Campaign Updates", desc: "When campaigns start or complete" },
            { key: "ai_credits_low", label: "AI Credits Low", desc: "Alert when credits are below 10%" },
            { key: "weekly_report", label: "Weekly Report", desc: "Summary of weekly performance" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              <Switch
                checked={notifications[key as keyof typeof notifications]}
                onCheckedChange={(checked) => setNotifications((n) => ({ ...n, [key]: checked }))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <HiKey className="text-violet-500 text-xl" />
          <h3 className="font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>API Configuration</h3>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">OpenAI API Key</Label>
             <Input type="password" placeholder="sk-..." className="rounded-xl border-gray-200 h-11 font-mono text-sm text-foreground" />
            <p className="text-xs text-gray-400 mt-1">Configure via environment variable OPENAI_API_KEY</p>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <HiShieldCheck className="text-violet-500 text-xl" />
          <h3 className="font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>Security</h3>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Current Password</Label>
            <Input type="password" placeholder="••••••••" className="rounded-xl border-gray-200 h-11" />
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">New Password</Label>
            <Input type="password" placeholder="••••••••" className="rounded-xl border-gray-200 h-11" />
          </div>
          <Button className="brand-gradient-bg text-white border-0 hover:opacity-90 rounded-xl px-6 h-10 font-semibold text-sm">
            Update Password
          </Button>
        </div>
      </div>
    </div>
  );
}
