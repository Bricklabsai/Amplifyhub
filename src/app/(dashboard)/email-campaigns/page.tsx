"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { HiPlus, HiMail, HiPaperAirplane, HiUsers } from "react-icons/hi";
import { formatDate } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  SENT: "bg-emerald-100 text-emerald-700",
  DRAFT: "bg-gray-100 text-gray-600",
  SCHEDULED: "bg-blue-100 text-blue-700",
};

type Group = { id: string; name: string; _count: { contacts: number } };

export default function EmailCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [attaching, setAttaching] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", subject: "", htmlContent: "", previewText: "" });
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  useEffect(() => { 
    fetchCampaigns();
    fetchGroups();
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

  function toggleGroup(id: string) {
    setSelectedGroupIds((prev) => 
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  }

  async function create() {
    const res = await fetch("/api/email-campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    
    // If groups are selected, attach them to the new campaign
    if (selectedGroupIds.length > 0) {
      await fetch(`/api/email-campaigns/${data.id}/attach-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupIds: selectedGroupIds }),
      });
    }

    await fetchCampaigns();
    setOpen(false);
    setForm({ name: "", subject: "", htmlContent: "", previewText: "" });
    setSelectedGroupIds([]);
  }

  async function send(id: string) {
    setSending(id);
    const res = await fetch(`/api/email-campaigns/${id}/send`, { method: "POST" });
    if (res.ok) {
      await fetchCampaigns();
    }
    setSending(null);
  }

  async function resend(id: string) {
    setSending(id);
    const res = await fetch(`/api/email-campaigns/${id}/resend`, { method: "POST" });
    if (res.ok) {
      await fetchCampaigns();
    }
    setSending(null);
  }

  async function deleteCampaign(id: string) {
    await fetch(`/api/email-campaigns/${id}`, { method: "DELETE" });
    await fetchCampaigns();
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-sm">{campaigns.length} email campaigns</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="brand-gradient-bg text-white border-0 hover:opacity-90 rounded-xl font-semibold text-sm flex items-center gap-2">
              <HiPlus /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-lg">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "Outfit, sans-serif" }}>Create Email Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Campaign Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl h-11" placeholder="Monthly Newsletter" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Subject Line</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="rounded-xl h-11" placeholder="Your exciting subject line" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Preview Text</Label>
                <Input value={form.previewText} onChange={(e) => setForm({ ...form, previewText: e.target.value })} className="rounded-xl h-11" placeholder="Short preview shown in inbox..." />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Email Content (HTML or text)</Label>
                <Textarea
                  value={form.htmlContent}
                  onChange={(e) => setForm({ ...form, htmlContent: e.target.value })}
                  className="rounded-xl min-h-32 font-mono text-xs"
                  placeholder="<h1>Hello {{firstName}}!</h1><p>Your email content here...</p>"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Available tags: {"{{firstName}}"}, {"{{lastName}}"}, {"{{name}}"}, {"{{company}}"}, {"{{email}}"}
                </p>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  <HiUsers className="inline mr-1" /> Target Audience Groups
                </Label>
                <div className="flex flex-wrap gap-2">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                        selectedGroupIds.includes(group.id)
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {group.name} ({group._count?.contacts || 0})
                    </button>
                  ))}
                </div>
                {selectedGroupIds.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    {selectedGroupIds.reduce((total, id) => {
                      const g = groups.find(x => x.id === id);
                      return total + (g?._count?.contacts || 0);
                    }, 0)} total recipients selected
                  </p>
                )}
              </div>

              <Button onClick={create} disabled={!form.name || !form.subject} className="w-full brand-gradient-bg text-white border-0 hover:opacity-90 rounded-xl h-11 font-semibold">
                Create Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-gray-100" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-gray-400">
          <HiMail className="text-5xl mx-auto mb-4 text-gray-200" />
          <p className="font-semibold text-gray-600">No email campaigns</p>
          <p className="text-sm mt-1">Create beautiful email campaigns for your audience</p>
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
                  <h3 className="font-bold text-gray-900 text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>{c.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{c.subject}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>📧 {c._count?.recipients || 0} recipients</span>
                    {c.sentAt && <span>Sent {formatDate(c.sentAt)}</span>}
                    {c.openRate > 0 && <span>📊 {(c.openRate * 100).toFixed(1)}% open rate</span>}
                    {c.clickRate > 0 && <span>🖱️ {(c.clickRate * 100).toFixed(1)}% click rate</span>}
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
