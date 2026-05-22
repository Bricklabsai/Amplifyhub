"use client";

import { useState } from "react";
import { HiSparkles, HiCheckCircle, HiX } from "react-icons/hi";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface EmailImprovement {
  original: string;
  improved: string;
  suggestion: string;
}

export default function EmailEnhancer() {
  const [emailText, setEmailText] = useState("");
  const [improvements, setImprovements] = useState<EmailImprovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enhanceEmail() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/email-enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailText }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to enhance email");
      }
      const data = await res.json();
      setImprovements(data.improvements);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  function applyImprovement(improved: string) {
    setEmailText(improved);
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7331FF]/10">
          <HiSparkles className="text-lg text-[#7331FF]" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
            Polish your copy
          </h3>
          <p className="text-xs text-gray-500">Paste a draft and get AI suggestions</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <HiX className="shrink-0 text-lg" />
          {error}
        </div>
      )}

      <Label className="text-sm font-semibold text-gray-700">Your draft</Label>
      <Textarea
        value={emailText}
        onChange={(e) => setEmailText(e.target.value)}
        placeholder="Paste subject + body or any email text…"
        rows={6}
        className="mt-1.5 rounded-xl border-gray-200 text-black"
      />

      <Button
        onClick={enhanceEmail}
        disabled={!emailText.trim() || loading}
        className="mt-4 h-10 w-full brand-gradient-bg border-0 text-white hover:opacity-90 rounded-xl font-semibold"
      >
        <HiSparkles className="mr-2" />
        {loading ? "Analyzing…" : "Enhance"}
      </Button>

      {improvements.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Suggestions</p>
          {improvements.map((imp, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-[#7331FF]/15 bg-[#7331FF]/5 p-4"
            >
              <p className="text-xs font-semibold text-[#7331FF]">{imp.suggestion}</p>
              <p className="mt-2 text-sm italic text-gray-600">"{imp.original}"</p>
              <p className="mt-1 text-sm font-medium text-gray-900">"{imp.improved}"</p>
              <button
                type="button"
                onClick={() => applyImprovement(imp.improved)}
                className="mt-2 text-xs font-semibold text-[#7331FF] hover:underline"
              >
                Use this version
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
