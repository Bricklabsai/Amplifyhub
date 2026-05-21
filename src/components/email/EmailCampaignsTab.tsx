"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface EmailCampaignsTabProps {
  groups: any[];
  socialCampaigns: any[];
  templates: any[];
  onDataChange: () => void;
}

export default function EmailCampaignsTab({ groups, socialCampaigns, templates, onDataChange }: EmailCampaignsTabProps) {
  const [emailCampaigns, setEmailCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [filterCampaign, setFilterCampaign] = useState<string>("all");

  useEffect(() => {
    fetchEmailCampaigns();
  }, []);

  async function fetchEmailCampaigns() {
    const res = await fetch("/api/email-campaigns");
    const data = await res.json();
    setEmailCampaigns(data);
    setLoading(false);
  }

  async function send(id: string) {
    setSending(id);
    const res = await fetch(`/api/email-campaigns/${id}/send`, { method: "POST" });
    if (res.ok) {
      await fetchEmailCampaigns();
      onDataChange();
    }
    setSending(null);
  }

  async function resend(id: string) {
    setSending(id);
    const res = await fetch(`/api/email-campaigns/${id}/resend`, { method: "POST" });
    if (res.ok) {
      await fetchEmailCampaigns();
    }
    setSending(null);
  }

  async function deleteCampaign(id: string) {
    await fetch(`/api/email-campaigns/${id}`, { method: "DELETE" });
    await fetchEmailCampaigns();
  }

  const filteredCampaigns = filterCampaign === "all" 
    ? emailCampaigns 
    : emailCampaigns.filter(c => c.campaignId === filterCampaign);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <p className="text-gray-500 text-sm">{filteredCampaigns.length} email campaigns</p>
          {socialCampaigns.length > 0 && (
            <Select value={filterCampaign} onValueChange={setFilterCampaign}>
              <SelectTrigger className="w-[200px] rounded-xl h-9 text-sm">
                <SelectValue placeholder="Filter by campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All campaigns</SelectItem>
                <SelectItem value="none">No campaign</SelectItem>
                {socialCampaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <EmailCampaignWizard 
          groups={groups} 
          socialCampaigns={socialCampaigns}
          templates={templates}
          onCampaignCreated={() => {
            fetchEmailCampaigns();
            onDataChange();
          }} 
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-gray-100" />)}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-gray-400">
          <HiMail className="text-5xl mx-auto mb-4 text-gray-200" />
          <p className="font-semibold text-gray-600">No email campaigns</p>
          <p className="text-sm mt-1">Create beautiful email campaigns for your audience</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filteredCampaigns.map((c) => (
              <div key={c.id} className="flex items-center gap-4 p-5 hover:bg-gray-50/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0">
                  <HiMail className="text-pink-500 text-lg" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>{c.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{c.subject}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>📧 {c._count?.recipients || 0} recipients</span>
                    {c.sentAt && <span>Sent {formatDate(c.sentAt)}</span>}
                    {c.openRate > 0 && <span>📊 {(c.openRate * 100).toFixed(1)}% open rate</span>}
                    {c.clickRate > 0 && <span>🖱️ {(c.clickRate * 100).toFixed(1)}% click rate</span>}
                    {c.campaign && <span className="text-violet-600">🏷️ {c.campaign.name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={`${STATUS_COLORS[c.status]} border-0 text-xs font-medium`}>{c.status}</Badge>
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
