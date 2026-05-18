"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { HiSparkles, HiEye, HiDocumentDownload, HiCheckCircle, HiX, HiUsers, HiMail, HiPlus, HiPaperAirplane } from "react-icons/hi";

type EmailType = "NEWSLETTER" | "EVENT" | "TRANSACTIONAL" | "PROMOTIONAL" | "CUSTOM";
type Tone = "Professional" | "Casual" | "Friendly" | "Urgent";

type Group = { id: string; name: string; _count: { contacts: number } };
type EmailTemplate = { id: string; name: string; description: string | null; category: string; htmlContent: string };

interface GeneratedEmail {
  subject: string;
  preview: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
}

export default function AIEmailStudio() {
  const [step, setStep] = useState<"content" | "template" | "preview">("content");
  const [emailType, setEmailType] = useState<EmailType>("NEWSLETTER");
  const [tone, setTone] = useState<Tone>("Professional");
  const [prompt, setPrompt] = useState("");
  const [brandColor, setBrandColor] = useState("#7c3aed");

  const [generatedContent, setGeneratedContent] = useState<GeneratedEmail | null>(null);
  const [generatedTemplate, setGeneratedTemplate] = useState<string | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<EmailTemplate[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    void fetchSavedTemplates();
    void fetchAudienceGroups();
  }, []);

  async function fetchSavedTemplates() {
    try {
      const res = await fetch("/api/email-templates");
      if (res.ok) {
        const data = await res.json();
        setSavedTemplates(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to load saved templates", error);
    }
  }

  async function fetchAudienceGroups() {
    try {
      const res = await fetch("/api/audience");
      if (res.ok) {
        const data = await res.json();
        setGroups(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to load audience groups", error);
    }
  }

  async function generateContent() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/email-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, emailType, tone }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate content");
      }

      const data = await res.json();
      setGeneratedContent(data);
      setSubject(data.subject);
      setPreviewText(data.preview);
      setStep("template");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function generateTemplate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/email-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailType,
          purpose: prompt,
          brandColor,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate template");
      }

      const data = await res.json();
      setGeneratedTemplate(data.htmlContent);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function saveAsTemplate() {
    if (!generatedTemplate) return;

    try {
      const res = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: subject || generatedContent?.subject || "AI Template",
          description: previewText || generatedContent?.preview || "Generated with AI",
          category: emailType,
          htmlContent: generatedTemplate,
        }),
      });

      if (res.ok) {
        toast({ title: "Template saved", description: "Your email template is now available in the library." });
        setError(null);
        setPrompt("");
        setGeneratedContent(null);
        setGeneratedTemplate(null);
        setSubject("");
        setPreviewText("");
        setCampaignName("");
        setSelectedGroupIds([]);
        setStep("content");
        await fetchSavedTemplates();
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save template");
    }
  }

  function wrapPlainBodyHtml(content: GeneratedEmail | null) {
    if (!content) {
      return "<div style='color:#6b7280;padding:20px;'>No preview available</div>";
    }

    const bodyHtml = content.body
      .split("\n")
      .map((line) => `<p style=\"margin: 0 0 16px; line-height:1.6;\">${line}</p>`)
      .join("");

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="margin-bottom: 24px;">
          ${bodyHtml}
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <a href="${content.ctaUrl || '#'}" style="background: ${brandColor}; color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 8px; display: inline-block;">${content.ctaText || 'Learn More'}</a>
        </div>
      </div>
    `;
  }

  async function handleCreateCampaign(sendNow: boolean) {
    if (!campaignName.trim() || !subject.trim() || selectedGroupIds.length === 0) {
      toast({
        title: "Missing campaign info",
        description: "Provide a campaign name, subject, and select at least one audience group.",
        variant: "destructive",
      });
      return;
    }

    if (!generatedTemplate && !generatedContent) {
      toast({
        title: "No email content",
        description: "Generate email content and template before creating a campaign.",
        variant: "destructive",
      });
      return;
    }

    const htmlContent = generatedTemplate || wrapPlainBodyHtml(generatedContent);
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

      if (selectedGroupIds.length > 0) {
        const attachRes = await fetch(`/api/email-campaigns/${data.id}/attach-groups`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupIds: selectedGroupIds }),
        });

        if (!attachRes.ok) {
          const attachData = await attachRes.json();
          throw new Error(attachData.error || "Failed to attach audience groups");
        }
      }

      if (sendNow) {
        const sendRes = await fetch(`/api/email-campaigns/${data.id}/send`, {
          method: "POST",
        });

        if (!sendRes.ok) {
          const sendData = await sendRes.json();
          throw new Error(sendData.error || "Failed to send campaign");
        }

        toast({
          title: "Campaign sent",
          description: "Your campaign was created and is sending to selected audiences.",
        });
      } else {
        toast({
          title: "Campaign created",
          description: "Your campaign draft is saved and ready in Email Campaigns.",
        });
      }

      setPrompt("");
      setGeneratedContent(null);
      setGeneratedTemplate(null);
      setSubject("");
      setPreviewText("");
      setCampaignName("");
      setSelectedGroupIds([]);
      setStep("content");
      await fetchSavedTemplates();
    } catch (err) {
      console.error(err);
      toast({
        title: "Action failed",
        description: err instanceof Error ? err.message : "Could not complete campaign creation.",
        variant: "destructive",
      });
    } finally {
      setCreatingCampaign(false);
      setSendingCampaign(false);
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <HiSparkles className="text-3xl" />
              <h1 className="text-3xl font-black" style={{ fontFamily: "Outfit, sans-serif" }}>
                AI Email Studio
              </h1>
            </div>
            <p className="text-white/80">Generate email content and templates, then send campaigns to audiences from one place.</p>
          </div>
          <Link href="/email-campaigns" className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/20 transition">
            <HiMail /> Open Email Campaigns
          </Link>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { id: "content", label: "Content", icon: HiSparkles },
          { id: "template", label: "Template", icon: HiDocumentDownload },
          { id: "preview", label: "Preview", icon: HiEye },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => item.id === "content" && setStep("content")}
            disabled={step !== item.id && !generatedContent}
            className={`p-4 rounded-2xl border-2 transition-all ${
              step === item.id
                ? "border-violet-600 bg-violet-50"
                : generatedContent && item.id !== "content"
                ? "border-gray-200 bg-white hover:border-gray-300 cursor-pointer"
                : "border-gray-100 bg-gray-50 opacity-50"
            }`}
          >
            <item.icon className="text-2xl mb-2 mx-auto" />
            <p className="font-semibold text-sm">{item.label}</p>
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <HiX className="text-red-600 text-2xl flex-shrink-0 mt-1" />
          <div>
            <p className="font-semibold text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Step 1: Content Generation */}
      {step === "content" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-6">
          <h2 className="text-2xl font-bold">Step 1: Generate Email Content</h2>

          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-violet-900">Unified Email Studio</p>
                <p className="text-sm text-violet-700">Create AI email copy, turn it into a template, and send campaigns from the same workflow.</p>
              </div>
              <Link href="/email-campaigns" className="rounded-full border border-white bg-white/90 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100 transition">
                Open Campaigns
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Email Type</label>
              <select
                value={emailType}
                onChange={(e) => setEmailType(e.target.value as EmailType)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-violet-400 text-black"
              >
                <option value="NEWSLETTER">Newsletter</option>
                <option value="EVENT">Event Invitation</option>
                <option value="TRANSACTIONAL">Transactional</option>
                <option value="PROMOTIONAL">Promotional</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as Tone)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-violet-400 text-black"
              >
                <option value="Professional">Professional</option>
                <option value="Casual">Casual</option>
                <option value="Friendly">Friendly</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">What should the email say?</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'Tell customers about our new summer collection with a 20% discount, emphasize free shipping, and encourage them to shop now'"
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-violet-400 resize-none text-black"
            />
          </div>

          <button
            onClick={generateContent}
            disabled={!prompt || loading}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <HiSparkles /> {loading ? "Generating..." : "Generate Content"}
          </button>
        </div>
      )}

      {/* Step 2: Template Generation */}
      {step === "template" && generatedContent && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-6">
          <h2 className="text-2xl font-bold">Step 2: Generate Email Template</h2>

          {/* Content Preview */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Generated Content Preview</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-600">Subject:</p>
                <p className="font-semibold text-gray-900">{generatedContent.subject}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Preview Text:</p>
                <p className="text-sm text-gray-700">{generatedContent.preview}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Brand Color</label>
            <div className="flex gap-4 items-center">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-20 h-12 rounded-lg border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-violet-400 font-mono text-sm text-black"
              />
            </div>
          </div>

          <button
            onClick={generateTemplate}
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <HiSparkles /> {loading ? "Generating..." : "Generate Template"}
          </button>
        </div>
      )}

      {/* Step 3: Preview & Save */}
      {step === "preview" && (generatedTemplate || generatedContent) && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <h2 className="text-2xl font-bold mb-6">Step 3: Preview & Send</h2>

            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Campaign Name</label>
                    <input
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-violet-400 text-black"
                      placeholder="e.g. Spring Launch Campaign"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Subject</label>
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-violet-400 text-black"
                      placeholder="Email subject line"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Preview Text</label>
                    <input
                      value={previewText}
                      onChange={(e) => setPreviewText(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-violet-400 text-black"
                      placeholder="Short preview text for inbox" 
                    />
                  </div>
                </div>

                <div className="bg-violet-50 border border-violet-100 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-violet-900">Audience groups</p>
                      <p className="text-xs text-violet-700">Choose the groups to attach this campaign to.</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700">{selectedGroupIds.length} selected</span>
                  </div>

                  <div className="grid gap-2">
                    {groups.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-violet-200 bg-white p-4 text-sm text-violet-600">No audience groups yet. Create groups from the Audience page first.</div>
                    ) : (
                      groups.map((group) => (
                        <button
                          key={group.id}
                          onClick={() => {
                            setSelectedGroupIds((prev) =>
                              prev.includes(group.id) ? prev.filter((item) => item !== group.id) : [...prev, group.id]
                            );
                          }}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            selectedGroupIds.includes(group.id)
                              ? "border-violet-500 bg-violet-50"
                              : "border-white bg-white hover:border-violet-200"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-semibold text-gray-900">{group.name}</p>
                              <p className="text-xs text-gray-600">{group._count?.contacts || 0} contact{(group._count?.contacts || 0) !== 1 ? "s" : ""}</p>
                            </div>
                            {selectedGroupIds.includes(group.id) && <HiCheckCircle className="text-violet-600" />}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Email Preview</p>
                    <p className="text-sm text-gray-700">Subject: {subject || generatedContent?.subject}</p>
                    <p className="text-sm text-gray-700">Preview text: {previewText || generatedContent?.preview}</p>
                  </div>
                  <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-100">
                    <iframe
                      srcDoc={generatedTemplate || wrapPlainBodyHtml(generatedContent)}
                      className="w-full h-96"
                      title="Email Preview"
                      sandbox="allow-scripts"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <button
                onClick={() => setStep("content")}
                className="rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Start Over
              </button>
              <button
                onClick={saveAsTemplate}
                disabled={!generatedTemplate}
                className="rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 transition disabled:opacity-50"
              >
                <HiCheckCircle /> Save as Template
              </button>
              <div className="lg:col-span-2 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => handleCreateCampaign(false)}
                  disabled={creatingCampaign || !campaignName || !subject || selectedGroupIds.length === 0}
                  className="rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700 transition disabled:opacity-50"
                >
                  <HiPlus /> Create Campaign Draft
                </button>
                <button
                  onClick={() => handleCreateCampaign(true)}
                  disabled={sendingCampaign || !campaignName || !subject || selectedGroupIds.length === 0}
                  className="rounded-xl bg-fuchsia-600 py-3 text-sm font-semibold text-white hover:bg-fuchsia-700 transition disabled:opacity-50"
                >
                  <HiPaperAirplane /> Create & Send Campaign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
