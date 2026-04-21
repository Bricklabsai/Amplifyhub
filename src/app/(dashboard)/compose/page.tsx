"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HiSparkles, HiRefresh, HiSave, HiClock } from "react-icons/hi";
import { FaFacebook, FaInstagram, FaLinkedin, FaTiktok, FaYoutube, FaWhatsapp } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const PLATFORMS = [
  { id: "FACEBOOK", label: "Facebook", Icon: FaFacebook, color: "#1877F2" },
  { id: "TWITTER", label: "X / Twitter", Icon: FaXTwitter, color: "#000" },
  { id: "INSTAGRAM", label: "Instagram", Icon: FaInstagram, color: "#E1306C" },
  { id: "LINKEDIN", label: "LinkedIn", Icon: FaLinkedin, color: "#0A66C2" },
  { id: "TIKTOK", label: "TikTok", Icon: FaTiktok, color: "#000" },
  { id: "YOUTUBE", label: "YouTube", Icon: FaYoutube, color: "#FF0000" },
  { id: "WHATSAPP", label: "WhatsApp", Icon: FaWhatsapp, color: "#25D366" },
];

const TONES = ["professional", "casual", "humorous", "inspirational", "educational", "promotional"];

export default function ComposePage() {
  const [prompt, setPrompt] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState(["FACEBOOK", "TWITTER", "INSTAGRAM", "LINKEDIN"]);
  const [tone, setTone] = useState("professional");
  const [variations, setVariations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function togglePlatform(id: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setVariations({});
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, platforms: selectedPlatforms, tone }),
    });
    const data = await res.json();
    setVariations(data.variations || {});
    setLoading(false);
  }

  async function savePost(platform: string, content: string) {
    setSaving(true);
    await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, status: "DRAFT", title: `${platform} draft` }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  }

  const platformObj = PLATFORMS.find((p) => p.id === Object.keys(variations)[0]);

  return (
    <div className="max-w-6xl space-y-6">
      {/* Input Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <HiSparkles className="text-violet-500 text-xl" />
          <h2 className="font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>AI Content Generator</h2>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">What do you want to post about?</Label>
            <Textarea
              placeholder="Describe your content idea... e.g. 'Announce our new product launch with exciting features and a 20% launch discount'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-24 rounded-xl border-gray-200 focus:border-violet-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700 mb-2 block">Content Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="rounded-xl border-gray-200 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-semibold text-gray-700 mb-2 block">Target Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(({ id, label, Icon, color }) => (
                  <button
                    key={id}
                    onClick={() => togglePlatform(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      selectedPlatforms.includes(id)
                        ? "border-transparent text-white shadow-sm"
                        : "border-gray-200 text-gray-500 bg-white hover:border-gray-300"
                    }`}
                    style={selectedPlatforms.includes(id) ? { background: color } : {}}
                  >
                    <Icon className="text-sm" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button
            onClick={generate}
            disabled={loading || !prompt.trim() || selectedPlatforms.length === 0}
            className="brand-gradient-bg text-white border-0 hover:opacity-90 px-8 h-11 rounded-xl font-semibold"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <HiRefresh className="animate-spin text-lg" />
                Generating AI content...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <HiSparkles className="text-lg" />
                Generate Content
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Results */}
      {Object.keys(variations).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(variations).map(([platform, content]) => {
            const p = PLATFORMS.find((x) => x.id === platform);
            if (!p) return null;
            const { Icon, color, label } = p;
            return (
              <div key={platform} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <Icon style={{ color, fontSize: "1.2rem" }} />
                    <span className="font-bold text-gray-900 text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => savePost(platform, content as string)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-violet-600 transition-colors"
                    >
                      <HiSave className="text-sm" />
                      Save as draft
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <Textarea
                    value={content as string}
                    onChange={(e) => setVariations((v) => ({ ...v, [platform]: e.target.value }))}
                    className="min-h-40 border-0 resize-none text-sm text-gray-700 p-0 focus:ring-0 shadow-none"
                  />
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                    <span className="text-xs text-gray-400">{(content as string).length} chars</span>
                    <Button
                      size="sm"
                      onClick={() => savePost(platform, content as string)}
                      className="brand-gradient-bg text-white border-0 hover:opacity-90 rounded-lg text-xs h-8"
                    >
                      <HiSave className="mr-1" />
                      Save Draft
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {saved && (
        <div className="fixed bottom-6 right-6 bg-emerald-500 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 z-50">
          ✓ Post saved as draft
        </div>
      )}
    </div>
  );
}
