"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { HiSparkles, HiPhotograph, HiDownload } from "react-icons/hi";

const STYLES = ["photorealistic", "digital art", "illustration", "watercolor", "3D render", "minimalist", "abstract", "vintage"];
const TEMPLATES = [
  { id: "event-announcement", label: "Event Announcement" },
  { id: "marketing-campaign", label: "Marketing Campaign" },
  { id: "notice", label: "Notice" },
];

export default function AIStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("photorealistic");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [history, setHistory] = useState<Array<{ url: string; prompt: string; isMock: boolean }>>([]);
  const [template, setTemplate] = useState("event-announcement");

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true);
    const res = await fetch("/api/ai/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, style, template }),
    });
    const data = await res.json();
    if (data.url) {
      setImageUrl(data.url);
      setIsMock(data.mock || false);
      setHistory((h) => [{ url: data.url, prompt, isMock: data.mock || false }, ...h.slice(0, 7)]);
    }
    setLoading(false);
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2">
            <HiSparkles className="text-violet-500 text-xl" />
            <h2 className="font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>AI Content Generator</h2>
            <Badge className="bg-violet-100 text-violet-700 border-0 text-xs">Gemini Flash / OpenAI</Badge>
          </div>

          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Image Description</Label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full min-h-28 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-violet-400 resize-none"
              placeholder="A professional business team celebrating success in a modern office, golden hour lighting, high quality..."
            />
          </div>

          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Template</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger className="rounded-xl border-gray-200 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Visual Style</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="rounded-xl border-gray-200 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={generate}
            disabled={loading || !prompt.trim()}
            className="w-full brand-gradient-bg text-white border-0 hover:opacity-90 h-11 rounded-xl font-semibold"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Generating image...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <HiPhotograph className="text-lg" />
                Generate Image
              </span>
            )}
          </Button>

          {isMock && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-xl p-3">
              ⚡ Using mock content. Add NANO_API_KEY to your environment to enable Gemini AI generation.
            </p>
          )}
        </div>

        {/* Preview Panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {imageUrl ? (
            <div className="relative">
              <img src={imageUrl} alt={prompt} className="w-full aspect-square object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                <a
                  href={imageUrl}
                  download="amplifyhub-ai-image.jpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-gray-50"
                >
                  <HiDownload /> Download
                </a>
              </div>
            </div>
          ) : (
            <div className="aspect-square flex flex-col items-center justify-center text-gray-300">
              <HiPhotograph className="text-8xl mb-4" />
              <p className="text-sm text-gray-400">Your AI image will appear here</p>
              <p className="text-xs text-gray-300 mt-1">Enter a description and click Generate</p>
            </div>
          )}
          {imageUrl && (
            <div className="p-4 border-t border-gray-50">
              <p className="text-xs text-gray-500 line-clamp-2">{prompt}</p>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>Recent Generations</h3>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => setImageUrl(h.url)}
                className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-violet-400 transition-all"
              >
                <img src={h.url} alt={h.prompt} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
