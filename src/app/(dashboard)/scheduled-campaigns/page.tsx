"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HiPlus, HiArrowUp, HiTrash, HiSparkles } from "react-icons/hi";
import { formatDate } from "@/lib/utils";

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
  frequency: string;
  nextRunAt: string;
  sourceType: string;
  templateId: string;
};

type ScheduledCampaign = {
  id: string;
  name: string;
  subject: string;
  frequency: string;
  nextRunAt: string;
  lastRunAt: string | null;
  isActive: boolean;
  sourceType: string;
  failureCount: number;
  lastError: string | null;
};

type EmailTemplate = {
  id: string;
  name: string;
  htmlContent?: string;
};

export default function ScheduledCampaignsPage() {
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

  useEffect(() => {
    void loadData();
  }, []);

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
      body: JSON.stringify({
        ...form,
        nextRunAt,
      }),
    });
    if (res.ok) {
      await loadData();
      setDialogOpen(false);
      setForm({
        name: "",
        subject: "",
        htmlContent: "",
        frequency: "WEEKLY",
        nextRunAt: new Date().toISOString().slice(0, 16),
        sourceType: "custom",
        templateId: "",
      });
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
    const res = await fetch(`/api/scheduled-campaigns/${id}/run`, { method: "POST" });
    if (res.ok) {
      await loadData();
    }
    setRunningId(null);
  }

  async function deleteSchedule(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/scheduled-campaigns/${id}`, { method: "DELETE" });
    if (res.ok) await loadData();
    setDeletingId(null);
  }

  function selectTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    setForm((prev) => ({
      ...prev,
      templateId,
      htmlContent: template?.htmlContent || prev.htmlContent,
    }));
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-gray-500">Scheduled Email Campaigns</p>
          <h1 className="text-3xl font-bold text-gray-900">Automated newsletters and event sequences</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="brand-gradient-bg text-white border-0 hover:opacity-90 rounded-xl font-semibold text-sm flex items-center gap-2">
              <HiPlus /> New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl rounded-2xl">
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
                  <Select value={form.frequency} onValueChange={(value) => setForm({ ...form, frequency: value })}>
                    <SelectTrigger className="rounded-xl h-11 text-black">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">Next run</Label>
                  <Input
                    type="datetime-local"
                    value={form.nextRunAt}
                    onChange={(e) => setForm({ ...form, nextRunAt: e.target.value })}
                    className="rounded-xl h-11 text-black"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Automation Type</Label>
                <Select value={form.sourceType} onValueChange={(value) => setForm({ ...form, sourceType: value })}>
                    <SelectTrigger className="rounded-xl h-11 text-black">
                      <SelectValue placeholder="Select automation type" />
                    </SelectTrigger>
                  <SelectContent>
                    {SOURCE_TYPES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Pick a saved template (optional)</Label>
                <Select value={form.templateId} onValueChange={selectTemplate}>
                    <SelectTrigger className="rounded-xl h-11 text-black">
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">HTML Content</Label>
                <Textarea
                  value={form.htmlContent}
                  onChange={(e) => setForm({ ...form, htmlContent: e.target.value })}
                  className="min-h-[220px] rounded-2xl text-black"
                  placeholder="Enter the email body HTML or choose a template above"
                />
                {form.sourceType === "latest_posts" && (
                  <p className="text-xs text-gray-500 mt-2">Use <code className="rounded bg-gray-100 px-1 py-0.5">{'{{latest_posts}}'}</code> in your content to inject the latest posts.</p>
                )}
              </div>
              <Button onClick={createSchedule} disabled={creating || !form.name || !form.subject || !form.htmlContent} className="brand-gradient-bg text-white rounded-xl h-11 w-full">
                {creating ? "Creating schedule..." : "Create Schedule"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((index) => (
            <div key={index} className="bg-white rounded-2xl h-48 animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-gray-400">
          <HiSparkles className="text-5xl mx-auto mb-4 text-gray-200" />
          <p className="font-semibold text-gray-600">No scheduled campaigns yet</p>
          <p className="text-sm mt-1">Set up automated newsletters and recurring announcements for your audience.</p>
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
                <p className="text-sm text-gray-500">Subject: {schedule.subject}</p>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Next: {formatDate(schedule.nextRunAt)}</p>
                  <p>Last run: {schedule.lastRunAt ? formatDate(schedule.lastRunAt) : "Never"}</p>
                  {schedule.lastError && <p className="text-red-600">Last error: {schedule.lastError}</p>}
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
