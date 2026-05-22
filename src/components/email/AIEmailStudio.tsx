"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import {
  HiCheckCircle,
  HiDocumentDownload,
  HiMail,
  HiPaperAirplane,
  HiPlus,
  HiSparkles,
  HiTemplate,
  HiUser,
  HiX,
} from "react-icons/hi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type StudioMode = "client-email" | "html-template";
type EmailType = "NEWSLETTER" | "EVENT" | "TRANSACTIONAL" | "PROMOTIONAL" | "CUSTOM";
type Tone = "Professional" | "Casual" | "Friendly" | "Urgent";

type Group = { id: string; name: string; _count: { contacts: number } };

interface GeneratedEmail {
  subject: string;
  preview: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
}

const BRAND_PURPLE = "#7331FF";

export default function AIEmailStudio() {
  const { data: session } = useSession();
  const [mode, setMode] = useState<StudioMode>("client-email");
  const [emailStep, setEmailStep] = useState<"compose" | "send">("compose");
  const [templateStep, setTemplateStep] = useState<"design" | "save">("design");

  const [emailType, setEmailType] = useState<EmailType>("TRANSACTIONAL");
  const [tone, setTone] = useState<Tone>("Professional");
  const [prompt, setPrompt] = useState("");
  const [clientName, setClientName] = useState("");
  const [brandColor, setBrandColor] = useState(BRAND_PURPLE);
  const [templatePurpose, setTemplatePurpose] = useState("");

  const [generatedContent, setGeneratedContent] = useState<GeneratedEmail | null>(null);
  const [generatedTemplate, setGeneratedTemplate] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [senderDisplayName, setSenderDisplayName] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [bodyText, setBodyText] = useState("");

  const [loading, setLoading] = useState(false);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    void fetchAudienceGroups();
  }, []);

  useEffect(() => {
    if (session?.user?.email && !replyToEmail) {
      setReplyToEmail(session.user.email);
    }
    if (session?.user?.name && !senderDisplayName) {
      setSenderDisplayName(session.user.name);
    }
  }, [session, replyToEmail, senderDisplayName]);

  async function fetchAudienceGroups() {
    try {
      const res = await fetch("/api/audience");
      if (res.ok) {
        const data = await res.json();
        setGroups(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load audience groups", err);
    }
  }

  function resetClientFlow() {
    setEmailStep("compose");
    setPrompt("");
    setClientName("");
    setGeneratedContent(null);
    setSubject("");
    setPreviewText("");
    setBodyText("");
    setCampaignName("");
    setSelectedGroupIds([]);
    setError(null);
  }

  function resetTemplateFlow() {
    setTemplateStep("design");
    setTemplatePurpose("");
    setGeneratedTemplate(null);
    setTemplateName("");
    setError(null);
  }

  function switchMode(next: StudioMode) {
    setMode(next);
    setError(null);
    if (next === "client-email") resetTemplateFlow();
    else resetClientFlow();
  }

  async function generateClientEmail() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/email-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          emailType,
          tone,
          mode: "client",
          recipientName: clientName.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate email");
      }
      const data = await res.json();
      setGeneratedContent(data);
      setSubject(data.subject || "");
      setPreviewText(data.preview || "");
      setBodyText(data.body || "");
      setEmailStep("send");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function generateHtmlTemplate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/email-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailType,
          purpose: templatePurpose || prompt,
          brandColor,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate template");
      }
      const data = await res.json();
      setGeneratedTemplate(data.htmlContent);
      setTemplateName(`${emailType} — ${new Date().toLocaleDateString()}`);
      setTemplateStep("save");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  function wrapPlainBodyHtml(content: { body: string; ctaText?: string; ctaUrl?: string }) {
    const bodyHtml = content.body
      .split("\n")
      .filter(Boolean)
      .map(
        (line) =>
          `<p style="margin:0 0 16px;line-height:1.65;color:#1f2937;font-family:Inter,Arial,sans-serif;font-size:15px;">${line}</p>`
      )
      .join("");

    const cta =
      content.ctaText && content.ctaText !== "Learn More"
        ? `<div style="text-align:center;margin-top:28px;"><a href="${content.ctaUrl || "#"}" style="background:${brandColor};color:#fff;padding:12px 28px;text-decoration:none;border-radius:10px;display:inline-block;font-weight:600;">${content.ctaText}</a></div>`
        : "";

    return `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff;">${bodyHtml}${cta}<p style="margin-top:32px;font-size:12px;color:#9ca3af;">Sent via AmplifyHub</p></div>`;
  }

  async function saveTemplateToLibrary() {
    if (!generatedTemplate) return;
    try {
      const res = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName || "AI Template",
          description: templatePurpose || "Generated with AI Studio",
          category: emailType,
          htmlContent: generatedTemplate,
        }),
      });
      if (res.ok) {
        toast({
          title: "Template saved",
          description: "Find it in the Templates tab to reuse in campaigns.",
        });
        resetTemplateFlow();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    }
  }

  async function handleCreateCampaign(sendNow: boolean) {
    if (!campaignName.trim() || !subject.trim() || selectedGroupIds.length === 0) {
      toast({
        title: "Missing info",
        description: "Add a campaign name, subject, and at least one audience group.",
        variant: "destructive",
      });
      return;
    }

    const htmlContent = wrapPlainBodyHtml({
      body: bodyText,
      ctaText: generatedContent?.ctaText,
      ctaUrl: generatedContent?.ctaUrl,
    });

    setCreatingCampaign(true);
    setSendingCampaign(sendNow);
    try {
      const res = await fetch("/api/email-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          subject,
          previewText,
          htmlContent,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create campaign");
      }
      const data = await res.json();

      const attachRes = await fetch(`/api/email-campaigns/${data.id}/attach-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupIds: selectedGroupIds }),
      });
      if (!attachRes.ok) {
        const attachData = await attachRes.json();
        throw new Error(attachData.error || "Failed to attach audience");
      }

      if (sendNow) {
        if (!replyToEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyToEmail.trim())) {
          throw new Error("Enter a valid reply-to email address");
        }
        const sendRes = await fetch(`/api/email-campaigns/${data.id}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            replyTo: replyToEmail.trim(),
            senderName: senderDisplayName.trim() || undefined,
          }),
        });
        if (!sendRes.ok) {
          const sendData = await sendRes.json();
          throw new Error(sendData.error || "Failed to send");
        }
        toast({ title: "Email sent", description: "Campaign is sending to your selected groups." });
      } else {
        toast({ title: "Draft saved", description: "Open Campaigns to review and send later." });
      }
      resetClientFlow();
    } catch (err) {
      toast({
        title: "Failed",
        description: err instanceof Error ? err.message : "Could not create campaign",
        variant: "destructive",
      });
    } finally {
      setCreatingCampaign(false);
      setSendingCampaign(false);
    }
  }

  const previewHtml =
    mode === "client-email"
      ? wrapPlainBodyHtml({ body: bodyText, ctaText: generatedContent?.ctaText, ctaUrl: generatedContent?.ctaUrl })
      : generatedTemplate || "";

  return (
    <div className="space-y-6">
      {/* Mode switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => switchMode("client-email")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
              mode === "client-email"
                ? "bg-[#7331FF] text-white shadow-sm"
                : "text-gray-700 hover:bg-[#7331FF]/12 hover:text-[#7331FF]"
            }`}
          >
            <HiMail className="text-base" />
            Client email
          </button>
          <button
            type="button"
            onClick={() => switchMode("html-template")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
              mode === "html-template"
                ? "bg-[#7331FF] text-white shadow-sm"
                : "text-gray-700 hover:bg-[#7331FF]/12 hover:text-[#7331FF]"
            }`}
          >
            <HiTemplate className="text-base" />
            HTML template
          </button>
        </div>
        <p className="text-sm text-gray-500">
          {mode === "client-email"
            ? "Write a normal email to send to clients or contacts."
            : "Design a reusable HTML layout for your template library."}
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <HiX className="mt-0.5 shrink-0 text-xl text-red-600" />
          <div>
            <p className="font-semibold text-red-900">Something went wrong</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* ——— Client email mode ——— */}
      {mode === "client-email" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            {emailStep === "compose" && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
                <h3
                  className="text-xl font-bold text-gray-900"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Write your email
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Describe what you want to say. AI drafts a ready-to-send client email.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Client name (optional)</Label>
                    <div className="relative mt-1.5">
                      <HiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="e.g. Sarah Johnson"
                        className="h-11 rounded-xl border-gray-200 pl-9 text-black"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Tone</Label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value as Tone)}
                      className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm text-black focus:border-[#7331FF] focus:outline-none focus:ring-1 focus:ring-[#7331FF]"
                    >
                      <option value="Professional">Professional</option>
                      <option value="Casual">Casual</option>
                      <option value="Friendly">Friendly</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <Label className="text-sm font-semibold text-gray-700">Email purpose</Label>
                  <select
                    value={emailType}
                    onChange={(e) => setEmailType(e.target.value as EmailType)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm text-black focus:border-[#7331FF] focus:outline-none"
                  >
                    <option value="TRANSACTIONAL">Follow-up / update</option>
                    <option value="PROMOTIONAL">Offer or announcement</option>
                    <option value="EVENT">Invitation</option>
                    <option value="NEWSLETTER">Newsletter-style</option>
                    <option value="CUSTOM">Other</option>
                  </select>
                </div>

                <div className="mt-4">
                  <Label className="text-sm font-semibold text-gray-700">What should this email say?</Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. Thank them for the meeting, confirm next steps for the proposal, and ask if they have questions about pricing."
                    rows={5}
                    className="mt-1.5 rounded-xl border-gray-200 text-black"
                  />
                </div>

                <Button
                  onClick={generateClientEmail}
                  disabled={!prompt.trim() || loading}
                  className="mt-6 h-11 w-full brand-gradient-bg border-0 text-white hover:opacity-90 rounded-xl font-semibold"
                >
                  <HiSparkles className="mr-2" />
                  {loading ? "Writing email…" : "Generate client email"}
                </Button>
              </div>
            )}

            {emailStep === "send" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Edit & send
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEmailStep("compose")}
                      className="text-sm font-medium text-[#7331FF] hover:underline"
                    >
                      ← Rewrite
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-semibold text-gray-700">Subject</Label>
                      <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="mt-1.5 h-11 rounded-xl border-gray-200 text-black"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-700">Preview line</Label>
                      <Input
                        value={previewText}
                        onChange={(e) => setPreviewText(e.target.value)}
                        className="mt-1.5 h-11 rounded-xl border-gray-200 text-black"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-700">Email body</Label>
                      <Textarea
                        value={bodyText}
                        onChange={(e) => setBodyText(e.target.value)}
                        rows={10}
                        className="mt-1.5 rounded-xl border-gray-200 font-mono text-sm text-black"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#7331FF]/15 bg-[#7331FF]/5 p-6">
                  <h4 className="font-semibold text-gray-900">Send to audience</h4>
                  <p className="mt-1 text-sm text-gray-500">
                    Emails are sent through AmplifyHub&apos;s mail service. Recipients reply to the
                    address you set below.
                  </p>

                  <div className="mt-4 rounded-xl border border-[#7331FF]/20 bg-white/80 p-4 text-sm text-gray-600">
                    <p>
                      <span className="font-semibold text-gray-800">From (in inbox):</span> Your name
                      + platform sender — configured by your admin (
                      <code className="text-xs text-[#7331FF]">FROM_EMAIL</code>).
                    </p>
                    <p className="mt-2">
                      <span className="font-semibold text-gray-800">Reply-to:</span> Where client
                      replies land — usually your work email.
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-sm font-semibold text-gray-700">Your name (shown to recipients)</Label>
                      <Input
                        value={senderDisplayName}
                        onChange={(e) => setSenderDisplayName(e.target.value)}
                        placeholder="e.g. Elizabeth Onyango"
                        className="mt-1.5 h-11 rounded-xl border-gray-200 text-black"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-700">Reply-to email *</Label>
                      <Input
                        type="email"
                        value={replyToEmail}
                        onChange={(e) => setReplyToEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="mt-1.5 h-11 rounded-xl border-gray-200 text-black"
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <Input
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="Campaign name"
                      className="h-11 rounded-xl border-gray-200 text-black"
                    />
                    <div className="max-h-40 space-y-2 overflow-y-auto">
                      {groups.map((group) => (
                        <label
                          key={group.id}
                          className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${
                            selectedGroupIds.includes(group.id)
                              ? "border-[#7331FF] bg-white"
                              : "border-gray-200 bg-white hover:border-[#7331FF]/40"
                          }`}
                        >
                          <span className="text-sm font-medium text-gray-900">
                            {group.name}{" "}
                            <span className="text-gray-400">({group._count?.contacts || 0})</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={selectedGroupIds.includes(group.id)}
                            onChange={() =>
                              setSelectedGroupIds((prev) =>
                                prev.includes(group.id)
                                  ? prev.filter((id) => id !== group.id)
                                  : [...prev, group.id]
                              )
                            }
                            className="accent-[#7331FF]"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      onClick={() => handleCreateCampaign(false)}
                      disabled={creatingCampaign}
                      className="h-11 rounded-xl border-gray-200 font-semibold"
                    >
                      <HiPlus className="mr-2" />
                      Save draft
                    </Button>
                    <Button
                      onClick={() => handleCreateCampaign(true)}
                      disabled={sendingCampaign}
                      className="h-11 rounded-xl brand-gradient-bg border-0 font-semibold text-white hover:opacity-90"
                    >
                      <HiPaperAirplane className="mr-2" />
                      {sendingCampaign ? "Sending…" : "Send now"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Live preview */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:self-start">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Preview</p>
            {emailStep === "send" && subject ? (
              <p className="mb-2 truncate text-sm font-bold text-gray-900">{subject}</p>
            ) : null}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              <iframe
                srcDoc={
                  bodyText
                    ? previewHtml
                    : "<div style='padding:24px;color:#9ca3af;font-family:sans-serif;text-align:center'>Generate an email to preview</div>"
                }
                className="h-[420px] w-full bg-white"
                title="Email preview"
                sandbox=""
              />
            </div>
          </div>
        </div>
      )}

      {/* ——— HTML template mode ——— */}
      {mode === "html-template" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            {templateStep === "design" && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
                <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Design HTML template
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create a reusable layout with header, sections, and footer for campaigns.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Template type</Label>
                    <select
                      value={emailType}
                      onChange={(e) => setEmailType(e.target.value as EmailType)}
                      className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm text-black"
                    >
                      <option value="NEWSLETTER">Newsletter</option>
                      <option value="EVENT">Event</option>
                      <option value="TRANSACTIONAL">Transactional</option>
                      <option value="PROMOTIONAL">Promotional</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Brand color</Label>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        type="color"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="h-11 w-14 cursor-pointer rounded-xl border border-gray-200"
                      />
                      <Input
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="h-11 flex-1 rounded-xl font-mono text-sm text-black"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Label className="text-sm font-semibold text-gray-700">Template purpose</Label>
                  <Textarea
                    value={templatePurpose}
                    onChange={(e) => setTemplatePurpose(e.target.value)}
                    placeholder="e.g. Monthly product newsletter with hero image, 3 article blocks, and social links"
                    rows={4}
                    className="mt-1.5 rounded-xl border-gray-200 text-black"
                  />
                </div>

                <Button
                  onClick={generateHtmlTemplate}
                  disabled={!templatePurpose.trim() || loading}
                  className="mt-6 h-11 w-full brand-gradient-bg border-0 text-white hover:opacity-90 rounded-xl font-semibold"
                >
                  <HiSparkles className="mr-2" />
                  {loading ? "Designing…" : "Generate HTML template"}
                </Button>
              </div>
            )}

            {templateStep === "save" && generatedTemplate && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
                <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Save to library
                </h3>
                <div className="mt-4">
                  <Label className="text-sm font-semibold text-gray-700">Template name</Label>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="mt-1.5 h-11 rounded-xl border-gray-200 text-black"
                  />
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    onClick={saveTemplateToLibrary}
                    className="h-11 brand-gradient-bg border-0 text-white hover:opacity-90 rounded-xl font-semibold"
                  >
                    <HiCheckCircle className="mr-2" />
                    Save template
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setTemplateStep("design")}
                    className="h-11 rounded-xl border-gray-200 font-semibold"
                  >
                    Regenerate
                  </Button>
                  <Button variant="outline" asChild className="h-11 rounded-xl border-gray-200 font-semibold">
                    <Link href="/email-hub?tab=campaigns">Use in campaign</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:sticky lg:top-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Template preview</p>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              <iframe
                srcDoc={
                  generatedTemplate ||
                  "<div style='padding:24px;color:#9ca3af;text-align:center;font-family:sans-serif'>Template preview appears here</div>"
                }
                className="h-[420px] w-full bg-white"
                title="Template preview"
                sandbox=""
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
