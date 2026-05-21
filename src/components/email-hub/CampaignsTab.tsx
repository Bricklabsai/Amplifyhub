"use client";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HiMail, HiPaperAirplane } from "react-icons/hi";
import { formatDate } from "@/lib/utils";
import EmailCampaignWizard from "@/components/email-campaigns/EmailCampaignWizard";

const STATUS_COLORS: Record<string, string> = {
  SENT: "bg-emerald-100 text-emerald-700",
  DRAFT: "bg-gray-100 text-gray-600",
  SCHEDULED: "bg-blue-100 text-blue-700",
  PARTIAL_SUCCESS: "bg-amber-100 text-amber-700",
  FAILED: "bg-red-100 text-red-700",
};

type Group = { id: string; name: string; _count: { contacts: number } };

interface CampaignsTabProps {
  preselectedGroupId?: string;
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  sentAt: string | null;
  openRate: number;
  clickRate: number;
  _count?: {
    recipients: number;
  };
}

export default function CampaignsTab({ preselectedGroupId }: CampaignsTabProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    void fetchCampaigns();
    void fetchGroups();
  }, []);

  async function fetchCampaigns() {
    const res = await fetch("/api/email-campaigns");
    const data = await res.json();
    setCampaigns(data);
    setLoading(false);
  }

  async function fetchGroups() {
    const res = await fetch("/api/audience");
    const data = await res.json();
    setGroups(data);
  }

  async function send(id: string) {
    setSending(id);
    const res = await fetch(`/api/email-campaigns/${id}/send`, { method: "POST" });
    if (res.ok) await fetchCampaigns();
    setSending(null);
  }

  async function resend(id: string) {
    setSending(id);
    const res = await fetch(`/api/email-campaigns/${id}/resend`, { method: "POST" });
    if (res.ok) await fetchCampaigns();
    setSending(null);
  }

  async function deleteCampaign(id: string) {
    await fetch(`/api/email-campaigns/${id}`, { method: "DELETE" });
    await fetchCampaigns();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-sm">{campaigns.length} email campaign{campaigns.length !== 1 ? "s" : ""}</p>
        <EmailCampaignWizard
          groups={groups}
          onCampaignCreated={fetchCampaigns}
          preselectedGroupId={preselectedGroupId}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-gray-400">
          <HiMail className="text-5xl mx-auto mb-4 text-gray-200" />
          <p className="font-semibold text-gray-600">No email campaigns yet</p>
          <p className="text-sm mt-1">Create your first campaign to reach your audience</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {campaigns.map((c) => (
              <div key={c.id} className="flex items-center gap-4 p-5 hover:bg-gray-50/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0">
                  <HiMail className="text-pink-500 text-lg" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {c.name}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">{c.subject}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>📧 {c._count?.recipients || 0} recipients</span>
                    {c.sentAt && <span>Sent {formatDate(c.sentAt)}</span>}
                    {c.openRate > 0 && <span>📊 {(c.openRate * 100).toFixed(1)}% open</span>}
                    {c.clickRate > 0 && <span>🖱️ {(c.clickRate * 100).toFixed(1)}% click</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={`${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"} border-0 text-xs font-medium`}>
                    {c.status}
                  </Badge>
                  {c.status === "DRAFT" && (
                    <Button
                      size="sm"
                      onClick={() => send(c.id)}
                      disabled={sending === c.id}
                      className="brand-gradient-bg text-white border-0 hover:opacity-90 rounded-lg text-xs h-8 flex items-center gap-1"
                    >
                      <HiPaperAirplane className="text-xs" />
                      {sending === c.id ? "Sending..." : "Send"}
                    </Button>
                  )}
                  {c.status === "SENT" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resend(c.id)}
                      disabled={sending === c.id}
                      className="rounded-lg text-xs h-8 flex items-center gap-1"
                    >
                      <HiPaperAirplane className="text-xs" />
                      Resend
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteCampaign(c.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs h-8"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
