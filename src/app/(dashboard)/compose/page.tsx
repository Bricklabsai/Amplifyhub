"use client";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HiSparkles, HiRefresh, HiSave, HiUpload, HiPaperAirplane, HiEye, HiCalendar } from "react-icons/hi";
import { FaFacebook, FaInstagram, FaLinkedin, FaTiktok, FaYoutube, FaWhatsapp } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
const SOCIAL_ASPECTS: Record<string, string> = {
  FACEBOOK: "aspect-[1.91/1]",
  TWITTER: "aspect-[16/9]",
  INSTAGRAM: "aspect-square",
  LINKEDIN: "aspect-[1.91/1]",
  TIKTOK: "aspect-[9/16]",
  YOUTUBE: "aspect-video",
  WHATSAPP: "aspect-square",
};

type MediaItem = {
  id: string;
  url: string;
  type: string;
  filename: string;
  isAI: boolean;
};

type Contact = { id: string; email: string; phone?: string | null; firstName?: string | null; lastName?: string | null };
type Group = { id: string; name: string; contacts: Contact[]; contactCount: number };
type SocialAccount = { id: string; platform: string; accountName: string; isActive: boolean };

function ComposeContent() {
  const searchParams = useSearchParams();
  const initialGroupId = searchParams.get("groupId");
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState(["FACEBOOK", "TWITTER", "INSTAGRAM", "LINKEDIN"]);
  const [tone, setTone] = useState("professional");
  const [variations, setVariations] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sendResult, setSendResult] = useState("");
  const [channel, setChannel] = useState<"EMAIL" | "WHATSAPP">("EMAIL");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [publishAccountIds, setPublishAccountIds] = useState<string[]>([]);
  const [publishingPlatform, setPublishingPlatform] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduling, setScheduling] = useState(false);

  function togglePlatform(id: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function toggleArrayValue(value: string, setter: (cb: (prev: string[]) => string[]) => void) {
    setter((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  }

  useEffect(() => {
    void loadMedia();
    void loadContactsAndGroups();
    void loadSocialAccounts();
  }, []);

  useEffect(() => {
    const fromLibrary = sessionStorage.getItem("compose-selected-media-ids");
    if (!fromLibrary) return;
    try {
      const ids = JSON.parse(fromLibrary);
      if (Array.isArray(ids)) setSelectedMedia(ids);
    } catch {
      // Ignore malformed storage payload
    }
    sessionStorage.removeItem("compose-selected-media-ids");
  }, []);

  async function loadMedia() {
    const res = await fetch("/api/media");
    if (!res.ok) return;
    const data = await res.json();
    setMedia(Array.isArray(data) ? data : []);
  }

  async function loadContactsAndGroups() {
    const res = await fetch("/api/contacts");
    if (!res.ok) return;
    const data = await res.json();
    setContacts(data.contacts || []);
    setGroups(data.groups || []);
    
    if (initialGroupId && data.groups?.some((g: Group) => g.id === initialGroupId)) {
      setSelectedGroupIds([initialGroupId]);
    }
  }

  async function loadSocialAccounts() {
    const res = await fetch("/api/social-accounts");
    if (!res.ok) return;
    const data = await res.json();
    const activeAccounts = (Array.isArray(data) ? data : []).filter((account: SocialAccount) => account.isActive);
    setSocialAccounts(activeAccounts);
    if (activeAccounts.length > 0) {
      setPublishAccountIds((prev) => (prev.length > 0 ? prev : activeAccounts.map((account: SocialAccount) => account.id)));
    }
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

  async function enhanceMessage() {
    const source = message || prompt;
    if (!source.trim()) return;
    setEnhancing(true);
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "enhance", prompt, message: source, tone }),
    });
    const data = await res.json();
    if (data.improvedMessage) setMessage(data.improvedMessage);
    setSuggestions(data.suggestions || []);
    setEnhancing(false);
  }

  async function uploadMedia(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/media", { method: "POST", body: formData });
    const data = await res.json();
    if (res.ok) {
      setMedia((prev) => [data, ...prev]);
      setSelectedMedia((prev) => [...prev, data.id]);
    }
    setUploading(false);
  }

  async function savePost(platform: string, content: string) {
    setSaving(true);
    const mediaUrls = media.filter((m) => selectedMedia.includes(m.id)).map((m) => m.url);
    await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, status: "DRAFT", title: `${platform} draft`, mediaUrls }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  }

  async function publishPost(platform: string, content: string) {
    if (publishAccountIds.length === 0 || !content.trim()) return;
    setPublishingPlatform(platform);
    setPublishResult("");
    const mediaUrls = media.filter((m) => selectedMedia.includes(m.id)).map((m) => m.url);

    const createRes = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        status: "DRAFT",
        title: `${platform} post`,
        mediaUrls,
      }),
    });
    const created = await createRes.json();
    if (!createRes.ok || !created?.id) {
      setPublishResult(created?.error || "Failed to create post for publishing.");
      setPublishingPlatform(null);
      return;
    }

    const publishRes = await fetch(`/api/posts/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "publish",
        content,
        mediaUrls,
        selectedSocialAccountIds: publishAccountIds,
      }),
    });
    const publishData = await publishRes.json();
    setPublishResult(publishRes.ok ? "Post published to selected social accounts." : publishData?.error || "Publish failed.");
    setPublishingPlatform(null);
  }

  async function scheduleAllPosts() {
    if (!scheduleDate || !scheduleTime) return;
    setScheduling(true);
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
    const mediaUrls = media.filter((m) => selectedMedia.includes(m.id)).map((m) => m.url);
    
    // We'll create one main Post that will be picked up by the scheduler
    // In a real scenario, you might want one per platform if they differ, 
    // but the current /api/scheduler logic publishes to ALL active social accounts
    const content = message || Object.values(variations)[0] || prompt;
    if (!content.trim()) {
      setScheduling(false);
      return;
    }

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        status: "SCHEDULED",
        scheduledAt: scheduledAt.toISOString(),
        mediaUrls,
        title: `Scheduled content for ${scheduleDate}`,
      }),
    });

    if (res.ok) {
      setPublishResult(`Content successfully scheduled for ${scheduleDate} at ${scheduleTime}`);
      setScheduleEnabled(false);
      setScheduleDate("");
      setScheduleTime("");
    } else {
      const data = await res.json();
      setPublishResult(data.error || "Failed to schedule content.");
    }
    setScheduling(false);
  }

  async function sendNow() {
    const content = message || Object.values(variations)[0] || prompt;
    if (!content.trim()) return;
    setSending(true);
    const mediaUrls = media.filter((m) => selectedMedia.includes(m.id)).map((m) => m.url);
    const res = await fetch("/api/compose/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        subject,
        channel,
        mediaUrls,
        groupIds: selectedGroupIds,
        selectedContactIds: channel === "EMAIL" ? selectedContactIds : [],
        whatsappContactIds: channel === "WHATSAPP" ? selectedContactIds : [],
      }),
    });
    const data = await res.json();
    setSendResult(data.message || data.error || "Completed");
    setSending(false);
  }

  const selectedMediaItems = useMemo(
    () => media.filter((m) => selectedMedia.includes(m.id)),
    [media, selectedMedia]
  );
  const whatsappContacts = contacts.filter((c) => Boolean(c.phone));

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

          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Compose Message</Label>
            <Textarea
              placeholder="Write your message (or generate then refine with AI)... e.g. 'Hello {{firstName}}, check out our new arrivals!'"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-28 rounded-xl border-gray-200 focus:border-violet-400 resize-none"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Available tags: {"{{firstName}}"}, {"{{lastName}}"}, {"{{name}}"}, {"{{company}}"}, {"{{email}}"}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button type="button" variant="outline" onClick={enhanceMessage} disabled={enhancing || (!message && !prompt)} className="rounded-lg">
                {enhancing ? <HiRefresh className="animate-spin mr-1" /> : <HiSparkles className="mr-1" />}
                AI Rephrase by Tone
              </Button>
              {suggestions.map((s, idx) => (
                <button
                  key={`${s}-${idx}`}
                  type="button"
                  onClick={() => setMessage(s)}
                  className="px-3 py-1.5 rounded-lg text-xs border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100"
                >
                  Use suggestion {idx + 1}
                </button>
              ))}
            </div>
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

          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <Label className="text-sm font-semibold text-gray-700 block">Media Upload</Label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3 h-10 rounded-lg bg-white border border-gray-200 cursor-pointer text-sm">
                <HiUpload />
                {uploading ? "Uploading..." : "Upload image, event poster, or video"}
                <input type="file" accept="image/*,video/*" className="hidden" onChange={uploadMedia} />
              </label>
              <Link href="/media-library?from=compose">
                <Button type="button" variant="outline">Open Media Library / AI Studio Images</Button>
              </Link>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Selected media: {selectedMediaItems.length}</p>
              <div className="flex flex-wrap gap-2">
                {selectedMediaItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleArrayValue(item.id, setSelectedMedia)}
                    className="text-xs px-2.5 py-1.5 rounded-md border border-gray-200 bg-white text-gray-700"
                  >
                    {item.filename} (remove)
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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>Recipients & Delivery</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Category Channel</Label>
            <Select value={channel} onValueChange={(v: "EMAIL" | "WHATSAPP") => { setChannel(v); setSelectedContactIds([]); }}>
              <SelectTrigger className="rounded-xl border-gray-200 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMAIL">Email Category</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp Category</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">Audience Categories</Label>
          <div className="flex flex-wrap gap-2">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => toggleArrayValue(group.id, setSelectedGroupIds)}
                className={`px-3 py-1.5 rounded-lg text-xs border ${
                  selectedGroupIds.includes(group.id)
                    ? "border-violet-500 bg-violet-50 text-violet-700"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                {group.name} ({group.contactCount})
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">
            {channel === "WHATSAPP" ? "Individual WhatsApp Contacts" : "Individual Email Contacts"}
          </Label>
          <div className="max-h-44 overflow-auto border border-gray-100 rounded-xl p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            {(channel === "WHATSAPP" ? whatsappContacts : contacts).map((contact) => {
              const label = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email;
              return (
                <label key={contact.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedContactIds.includes(contact.id)}
                    onChange={() => toggleArrayValue(contact.id, setSelectedContactIds)}
                  />
                  <span className="truncate">{label} - {channel === "WHATSAPP" ? contact.phone : contact.email}</span>
                </label>
              );
            })}
          </div>
        </div>
        {sendResult && <p className="text-sm text-gray-600 mt-4">{sendResult}</p>}
        <div className="flex gap-3 pt-4">
          <Button onClick={sendNow} disabled={sending} className="brand-gradient-bg text-white border-0 hover:opacity-90 px-8 h-11 rounded-xl font-semibold">
            {sending ? "Sending..." : `Send ${channel === "WHATSAPP" ? "WhatsApp" : "Email"} Message`}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>Preview on Selected Social Accounts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedPlatforms.map((platform) => {
            const p = PLATFORMS.find((x) => x.id === platform);
            if (!p) return null;
            return (
              <div key={platform} className="rounded-xl border border-gray-100 p-4 bg-gray-50">
                <div className="font-semibold text-sm mb-2">{p.label}</div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{message || variations[platform] || prompt}</p>
                {selectedMediaItems.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {selectedMediaItems.map((item) =>
                      item.type === "video" ? (
                        <div key={`${platform}-${item.id}`} className={`w-full rounded-md overflow-hidden bg-black/5 ${SOCIAL_ASPECTS[platform] || "aspect-square"}`}>
                          <video src={item.url} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div key={`${platform}-${item.id}`} className={`w-full rounded-md overflow-hidden bg-black/5 ${SOCIAL_ASPECTS[platform] || "aspect-square"}`}>
                          <img src={item.url} alt={item.filename} className="w-full h-full object-cover" />
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>Social Media Schedule</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
            />
            <span className="text-sm font-medium text-gray-700"><HiCalendar className="inline mr-1" /> Schedule for later</span>
          </label>
        </div>

        {scheduleEnabled && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Date</Label>
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="rounded-xl h-11"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Time</Label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="rounded-xl h-11"
                />
              </div>
            </div>
            <Button 
              onClick={scheduleAllPosts} 
              disabled={scheduling || !scheduleDate || !scheduleTime}
              className="bg-blue-600 text-white border-0 hover:bg-blue-700 px-8 h-11 rounded-xl font-semibold w-full md:w-auto"
            >
              <HiCalendar className="mr-2" />
              {scheduling ? "Scheduling..." : "Confirm Schedule for All Social Content"}
            </Button>
          </div>
        )}
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
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-violet-600 transition-colors">
                          <HiEye className="text-sm" />
                          Preview & publish
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{label} post preview</DialogTitle>
                          <DialogDescription>Review all content before publishing to your social accounts.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{content as string}</p>
                            {selectedMediaItems.length > 0 && (
                              <div className="mt-3 grid grid-cols-3 gap-2">
                                {selectedMediaItems.map((item) =>
                                  item.type === "video" ? (
                                    <video key={`preview-${platform}-${item.id}`} src={item.url} className="w-full h-20 object-cover rounded-md" />
                                  ) : (
                                    <img key={`preview-${platform}-${item.id}`} src={item.url} alt={item.filename} className="w-full h-20 object-cover rounded-md" />
                                  )
                                )}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700">Publish to social accounts</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {socialAccounts.map((account) => (
                                <label key={`${platform}-${account.id}`} className="flex items-center gap-2 text-sm text-gray-700 border border-gray-200 rounded-lg p-2">
                                  <input
                                    type="checkbox"
                                    checked={publishAccountIds.includes(account.id)}
                                    onChange={() => toggleArrayValue(account.id, setPublishAccountIds)}
                                  />
                                  <span className="truncate">{account.accountName} ({account.platform})</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={() => publishPost(platform, content as string)}
                            disabled={publishingPlatform === platform || publishAccountIds.length === 0}
                            className="brand-gradient-bg text-white border-0 hover:opacity-90"
                          >
                            <HiPaperAirplane className="mr-1" />
                            {publishingPlatform === platform ? "Publishing..." : "Publish now"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
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
                    <Button
                      size="sm"
                      onClick={() => publishPost(platform, content as string)}
                      disabled={publishingPlatform === platform || publishAccountIds.length === 0}
                      className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs h-8"
                    >
                      <HiPaperAirplane className="mr-1" />
                      {publishingPlatform === platform ? "Publishing..." : "Publish"}
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
      {publishResult && (
        <div className="fixed bottom-6 left-6 bg-violet-600 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium z-50">
          {publishResult}
        </div>
      )}
    </div>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ComposeContent />
    </Suspense>
  );
}
