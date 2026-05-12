"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HiPlus, HiTrash } from "react-icons/hi";

const TEMPLATE_CATEGORIES = [
  { label: "Newsletter", value: "NEWSLETTER" },
  { label: "Event", value: "EVENT" },
  { label: "Transactional", value: "TRANSACTIONAL" },
  { label: "Promotional", value: "PROMOTIONAL" },
  { label: "Custom", value: "CUSTOM" },
];

type TemplateForm = {
  name: string;
  description: string;
  category: string;
  htmlContent: string;
};

type EmailTemplate = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  htmlContent: string;
  createdAt: string;
};

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<TemplateForm>({
    name: "",
    description: "",
    category: "NEWSLETTER",
    htmlContent: "",
  });
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    void fetchTemplates();
  }, []);

  async function fetchTemplates() {
    setLoading(true);
    const res = await fetch("/api/email-templates");
    if (res.ok) {
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }

  async function createTemplate() {
    setCreating(true);
    const res = await fetch("/api/email-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      await fetchTemplates();
      setDialogOpen(false);
      setForm({ name: "", description: "", category: "NEWSLETTER", htmlContent: "" });
    }
    setCreating(false);
  }

  async function deleteTemplate(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/email-templates/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTemplates((prev) => prev.filter((template) => template.id !== id));
    }
    setDeletingId(null);
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-gray-500">Email Templates</p>
          <h1 className="text-3xl font-bold text-gray-900">Saved email templates</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="brand-gradient-bg text-white border-0 hover:opacity-90 rounded-xl font-semibold text-sm flex items-center gap-2">
              <HiPlus /> New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl rounded-2xl">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "Outfit, sans-serif" }}>Create Email Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Template Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Monthly newsletter" className="rounded-xl h-11" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="A short internal description" className="rounded-xl h-11" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Category</Label>
                <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">HTML Content</Label>
                <Textarea value={form.htmlContent} onChange={(e) => setForm({ ...form, htmlContent: e.target.value })} className="min-h-[220px] rounded-2xl" placeholder="Paste or type your email HTML here" />
              </div>
              <Button onClick={createTemplate} disabled={creating || !form.name || !form.htmlContent} className="brand-gradient-bg text-white rounded-xl h-11 w-full">
                {creating ? "Saving template..." : "Save Template"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((index) => (
            <div key={index} className="bg-white rounded-2xl h-52 animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-gray-400">
          <p className="font-semibold text-gray-600">No templates created yet</p>
          <p className="text-sm mt-1">Create a saved email template for your newsletters, events, and promotions.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{template.name}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-violet-500 mt-1">{template.category}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50 rounded-xl"
                    onClick={() => deleteTemplate(template.id)}
                    disabled={deletingId === template.id}
                  >
                    <HiTrash className="text-base" />
                  </Button>
                </div>
                {template.description && <p className="text-sm text-gray-500 mt-3">{template.description}</p>}
              </div>
              <div className="border-t border-gray-100 p-4 bg-slate-50">
                <p className="text-xs text-gray-500 mb-2">Preview</p>
                <div className="text-xs text-gray-600 whitespace-pre-wrap max-h-40 overflow-auto leading-relaxed">{template.htmlContent}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
