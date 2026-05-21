"use client";
import { useState } from "react";
import { HiSparkles, HiCheckCircle, HiX } from "react-icons/hi";

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

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-2">Email Enhancer</h3>
        <p className="text-sm text-gray-600">
          Paste your email content and let AI suggest improvements
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <HiX className="text-red-600 flex-shrink-0 text-2xl" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <textarea
        value={emailText}
        onChange={(e) => setEmailText(e.target.value)}
        placeholder="Paste your email content here..."
        rows={6}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-violet-400 resize-none text-black"
      />

      <button
        onClick={enhanceEmail}
        disabled={!emailText || loading}
        className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
      >
        <HiSparkles /> {loading ? "Analyzing..." : "Enhance Email"}
      </button>

      {improvements.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <p className="font-semibold text-gray-900">Suggestions:</p>
          {improvements.map((imp, idx) => (
            <div key={idx} className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-start gap-3 mb-2">
                <HiCheckCircle className="text-blue-600 flex-shrink-0 text-xl mt-1" />
                <div className="flex-1">
                  <p className="text-xs text-blue-600 font-semibold uppercase mb-1">
                    Suggestion: {imp.suggestion}
                  </p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Original:</p>
                      <p className="text-sm italic text-gray-700">
                        "{imp.original}"
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Improved:</p>
                      <p className="text-sm font-medium text-blue-900">
                        "{imp.improved}"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
