"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { HiPlus, HiFlag, HiCalendar } from "react-icons/hi";
import { formatDate } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  DRAFT: "bg-gray-100 text-gray-600",
  PAUSED: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-blue-100 text-blue-700",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", budget: "" });

  useEffect(() => { fetchCampaigns(); }, []);

  async function fetchCampaigns() {
    const res = await fetch("/api/campaigns");
    const data = await res.json();
    setCampaigns(data);
    setLoading(false);
  }

  async function create() {
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, budget: Number.parseFloat(form.budget) || 0, status: "DRAFT" }),
    });
    const data = await res.json();
    setCampaigns((c) => [data, ...c]);
    setOpen(false);
    setForm({ name: "", description: "", budget: "" });
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-sm">{campaigns.length} campaigns</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="brand-gradient-bg text-white border-0 hover:opacity-90 rounded-xl font-semibold text-sm flex items-center gap-2">
              <HiPlus /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "Outfit, sans-serif" }}>Create Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Campaign Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl h-11" placeholder="Q2 Growth Campaign" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl h-11" placeholder="Campaign description..." />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Budget ($)</Label>
                <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="rounded-xl h-11" placeholder="5000" />
              </div>
              <Button onClick={create} disabled={!form.name} className="w-full brand-gradient-bg text-white border-0 hover:opacity-90 rounded-xl h-11 font-semibold">
                Create Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map((i) => <div key={i} className="bg-white rounded-2xl h-40 animate-pulse border border-gray-100" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-gray-400">
          <HiFlag className="text-5xl mx-auto mb-4 text-gray-200" />
          <p className="font-semibold text-gray-600">No campaigns yet</p>
          <p className="text-sm mt-1">Create your first campaign to organize your content</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                  <HiFlag className="text-violet-500 text-lg" />
                </div>
                <Badge className={`${STATUS_COLORS[c.status]} border-0 text-xs font-medium`}>{c.status}</Badge>
              </div>
              <h3 className="font-bold text-gray-900 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>{c.name}</h3>
              {c.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{c.description}</p>}
              <div className="flex items-center gap-4 text-xs text-gray-400">
                {c.budget && <span>💰 ${c.budget}</span>}
                <span>📝 {c._count?.posts || 0} posts</span>
                {c.startDate && <span><HiCalendar className="inline" /> {formatDate(c.startDate)}</span>}
              </div>
              {c.platforms && c.platforms.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {c.platforms.map((p: string) => (
                    <span key={p} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
