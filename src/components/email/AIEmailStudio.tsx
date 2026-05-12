"use client";
import { useState } from "react";
import { HiSparkles, HiEye, HiDocumentDownload, HiCheckCircle, HiX } from "react-icons/hi";

type EmailType = "NEWSLETTER" | "EVENT" | "TRANSACTIONAL" | "PROMOTIONAL" | "CUSTOM";
type Tone = "Professional" | "Casual" | "Friendly" | "Urgent";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!generatedContent || !generatedTemplate) return;

    try {
      const res = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: generatedContent.subject,
          description: generatedContent.preview,
          category: emailType,
          htmlContent: generatedTemplate,
        }),
      });

      if (res.ok) {
        setError(null);
        // Reset
        setPrompt("");
        setGeneratedContent(null);
        setGeneratedTemplate(null);
        setStep("content");
      }
    } catch (err) {
      setError("Failed to save template");
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <HiSparkles className="text-3xl" />
          <h1 className="text-3xl font-black" style={{ fontFamily: "Outfit, sans-serif" }}>
            AI Email Studio
          </h1>
        </div>
        <p className="text-white/80">Generate beautiful emails with AI-powered content and templates</p>
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

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Email Type</label>
              <select
                value={emailType}
                onChange={(e) => setEmailType(e.target.value as EmailType)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-violet-400"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-violet-400"
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-violet-400 resize-none"
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
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-violet-400 font-mono text-sm"
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
      {step === "preview" && generatedContent && generatedTemplate && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <h2 className="text-2xl font-bold mb-6">Step 3: Preview & Save</h2>

            {/* Email Details */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-4">
              <div>
                <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Subject</p>
                <p className="font-semibold text-gray-900">{generatedContent.subject}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Preview</p>
                <p className="text-sm text-gray-700">{generatedContent.preview}</p>
              </div>
            </div>

            {/* Template Preview */}
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-100">
              <iframe
                srcDoc={generatedTemplate}
                className="w-full h-96"
                title="Email Preview"
                sandbox={{ allow: [] }}
              />
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setStep("content")}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition-all"
              >
                Start Over
              </button>
              <button
                onClick={saveAsTemplate}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <HiCheckCircle /> Save as Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
