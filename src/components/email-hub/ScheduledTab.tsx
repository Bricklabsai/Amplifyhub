"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HiPlus, HiSparkles } from "react-icons/hi";
import { formatDate } from "@/lib/utils";
import TipTapEditor from "@/components/email-campaigns/TipTapEditor";

const FREQUENCIES = [
  { label: "Daily", value: "DAILY" },
  { label: "Weekly", value: "WEEKLY" },
  { label: "Monthly", value: "MONTHLY" },
];

const SOURCE_TYPES = [
  { label: "Custom content", value: "custom" },
  { label: "Weekly newsletter from latest posts", value: "latest_posts" },
  { label: "Event invitation", value: "events" },
];

type ScheduleForm = {
  name: string;
  subject: string;
  htmlContent: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";
  nextRunAt: string;
  sourceType: string;
  templateId: string;
};

type ScheduledCampaign = {
  id: string;
  name: string;
  subject: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";
  nextRunAt: string;
  lastRunAt: string | null;
  isActive: boolean;
  sourceType: string;
  failureCount: number;
  lastError: string | null;
};

type EmailTemplate = { id: string; name: string; htmlContent?: string };

export default function ScheduledTab() {
  const [schedules, setSchedules] = useState<ScheduledCampaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleForm>({
    name: "",
    subject: "",
    htmlContent: "",
    frequency: "WEEKLY",
    nextRunAt: new Date().toISOString().slice(0, 16),
    sourceType: "custom",
    templateId: "",
  });

  useEffect(() => { void loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [scheduleRes, templateRes] = await Promise.all([
      fetch("/api/scheduled-campaigns"),
      fetch("/api/email-templates"),
    ]);
    if (scheduleRes.ok) setSchedules(await scheduleRes.json());
    if (templateRes.ok) setTemplates(await templateRes.json());
    setLoading(false);
  }

  async function createSchedule() {
    setCreating(true);
    const nextRunAt = form.nextRunAt ? new Date(form.nextRunAt).toISOString() : new Date().toISOString();
    const res = await fetch("/api/scheduled-campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, nextRunAt }),
    });
    if (res.ok) {
      await loadData();
      setDialogOpen(false);
      setForm({ name: "", subject: "", htmlContent: "", frequency: "WEEKLY", nextRunAt: new Date().toISOString().slice(0, 16), sourceType: "custom", templateId: "" });
    }
    setCreating(false);
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/scheduled-campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    await loadData();
  }

  async function runSchedule(id: string) {
    setRunningId(id);
    await fetch(`/api/scheduled-campaigns/${id}/run`, { method: "POST" });
    await loadData();
    setRunningId(null);
  }

  async function deleteSchedule(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/scheduled-campaigns/${id}`, { method: "DELETE" });
    if (res.ok) await loadData();
    setDeletingId(null);
  }

  function selectTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    setForm((prev) => ({ ...prev, templateId, htmlContent: template?.htmlContent || prev.htmlContent }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-sm">{schedules.length} scheduled campaign{schedules.length !== 1 ? "s" : ""}</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="brand-gradient-bg text-white border-0 hover:opacity-90 rounded-xl font-semibold text-sm flex items-center gap-2">
              <HiPlus /> New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "Outfit, sans-serif" }}>Create Scheduled Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Schedule Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl h-11 text-black" placeholder="Weekly newsletter" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Subject</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="rounded-xl h-11 text-black" placeholder="Your weekly update" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">Frequency</Label>
                  <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                    <SelectTrigger className="rounded-xl h-11 text-black"><SelectValue /></SelectTrigger>
                    <SelectContent>{FREQUENCIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">Next run</Label>
                  <Input type="datetime-local" value={form.nextRunAt} onChange={(e) => setForm({ ...form, nextRunAt: e.target.value })} className="rounded-xl h-11 text-black" />
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Automation Type</Label>
                <Select value={form.sourceType} onValueChange={(v) => setForm({ ...form, sourceType: v })}>
                  <SelectTrigger className="rounded-xl h-11 text-black"><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCE_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {templates.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">Pick a saved template (optional)</Label>
                  <Select value={form.templateId} onValueChange={selectTemplate}>
                    <SelectTrigger className="rounded-xl h-11 text-black"><SelectValue placeholder="Choose a template" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No template</SelectItem>
                      {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Email Content *</Label>
                <TipTapEditor value={form.htmlContent} onChange={(html) => setForm({ ...form, htmlContent: html })} />
                {form.sourceType === "latest_posts" && (
                  <p className="text-xs text-gray-500 mt-2">Use <code className="rounded bg-gray-100 px-1 py-0.5">{"{{latest_posts}}"}</code> to inject the latest posts.</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  💡 Personalization: {"{{firstName}}"}, {"{{lastName}}"}, {"{{company}}"}, {"{{unsubscribeUrl}}"}
                </p>
              </div>
              <Button onClick={createSchedule} disabled={creating || !form.name || !form.subject || !form.htmlContent} className="brand-gradient-bg text-white rounded-xl h-11 w-full">
                {creating ? "Creating..." : "Create Schedule"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl h-48 animate-pulse border border-gray-100" />)}
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-gray-400">
          <HiSparkles className="text-5xl mx-auto mb-4 text-gray-200" />
          <p className="font-semibold text-gray-600">No scheduled campaigns yet</p>
          <p className="text-sm mt-1">Set up automated newsletters and recurring announcements.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{schedule.name}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-violet-500 mt-1">{schedule.frequency}</p>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-semibold ${schedule.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                    {schedule.isActive ? "Active" : "Paused"}
                  </div>
                </div>
                <p className="text-sm text-gray-500 truncate">Subject: {schedule.subject}</p>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Next: {formatDate(schedule.nextRunAt)}</p>
                  <p>Last run: {schedule.lastRunAt ? formatDate(schedule.lastRunAt) : "Never"}</p>
                  {schedule.lastError && <p className="text-red-600 truncate">Error: {schedule.lastError}</p>}
                </div>
              </div>
              <div className="border-t border-gray-100 bg-slate-50 p-4 flex flex-col gap-2">
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => toggleActive(schedule.id, !schedule.isActive)}>
                  {schedule.isActive ? "Pause" : "Activate"}
                </Button>
                <Button size="sm" className="rounded-xl" onClick={() => runSchedule(schedule.id)} disabled={runningId === schedule.id}>
                  {runningId === schedule.id ? "Running..." : "Run now"}
                </Button>
                <Button size="sm" variant="ghost" className="rounded-xl text-red-600 hover:bg-red-50" onClick={() => deleteSchedule(schedule.id)} disabled={deletingId === schedule.id}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
