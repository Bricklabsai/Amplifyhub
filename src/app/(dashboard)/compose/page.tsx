"use client";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HiSparkles, HiRefresh, HiSave, HiUpload, HiPaperAirplane, HiEye, HiCalendar } from "react-icons/hi";
import { FaFacebook, FaInstagram, FaLinkedin, FaTiktok, FaYoutube, FaWhatsapp } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useToast } from "@/hooks/use-toast";
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
  const router = useRouter();
  const { toast } = useToast();
  const initialGroupId = searchParams.get("groupId");
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [tone, setTone] = useState("professional");
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
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduling, setScheduling] = useState(false);

  function togglePlatform(id: string) {
    setSelectedPlatforms((prev) => {
      const isSelecting = !prev.includes(id);
      const next = isSelecting ? [...prev, id] : prev.filter((p) => p !== id);
      
      // Sync with publishAccountIds
      if (isSelecting) {
        const accountsToSelect = socialAccounts
          .filter(acc => acc.platform.toUpperCase() === id)
          .map(acc => acc.id);
        
        setPublishAccountIds(prevIds => {
          const nextIds = [...prevIds];
          accountsToSelect.forEach(accountId => {
            if (!nextIds.includes(accountId)) nextIds.push(accountId);
          });
          return nextIds;
        });
      } else {
        const accountsToDeselect = socialAccounts
          .filter(acc => acc.platform.toUpperCase() === id)
          .map(acc => acc.id);
          
        setPublishAccountIds(prevIds => prevIds.filter(pid => !accountsToDeselect.includes(pid)));
      }
      
      return next;
    });
  }

  function toggleAccount(accountId: string) {
    const account = socialAccounts.find(a => a.id === accountId);
    if (!account) return;

    setPublishAccountIds((prev) => {
      const isChecking = !prev.includes(accountId);
      const next = isChecking ? [...prev, accountId] : prev.filter((id) => id !== accountId);
      
      // Sync with selectedPlatforms
      const platform = account.platform.toUpperCase();
      if (isChecking) {
        setSelectedPlatforms(prevPlatforms => 
          prevPlatforms.includes(platform) ? prevPlatforms : [...prevPlatforms, platform]
        );
      } else {
        // Check if any other accounts of the same platform are still selected
        const hasOtherAccountsOfSamePlatform = socialAccounts.some(acc => 
          acc.id !== accountId && 
          acc.platform.toUpperCase() === platform && 
          next.includes(acc.id)
        );
        
        if (!hasOtherAccountsOfSamePlatform) {
          setSelectedPlatforms(prevPlatforms => prevPlatforms.filter(p => p !== platform));
        }
      }
      
      return next;
    });
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
      setPublishAccountIds((prev) => {
        if (prev.length > 0) return prev;
        const initialIds = activeAccounts.map((account: SocialAccount) => account.id);
        
        // Also update selectedPlatforms to match initialIds
        const initialPlatforms = Array.from(new Set(activeAccounts.map(acc => acc.platform.toUpperCase())));
        setSelectedPlatforms(initialPlatforms);
        
        return initialIds;
      });
    }
  }

  const isTwitterSelected = useMemo(() => {
    if (selectedPlatforms.includes("TWITTER")) return true;
    return socialAccounts.some(
      (acc) => publishAccountIds.includes(acc.id) && acc.platform.toUpperCase() === "TWITTER"
    );
  }, [selectedPlatforms, socialAccounts, publishAccountIds]);

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true);
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        prompt, 
        platforms: selectedPlatforms, 
        tone,
        maxCharacters: isTwitterSelected ? 280 : undefined
      }),
    });
    const data = await res.json();
    if (data.content) setMessage(data.content);
    setLoading(false);
  }

  async function enhanceMessage() {
    const source = message || prompt;
    if (!source.trim()) return;
    setEnhancing(true);
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        action: "enhance", 
        prompt, 
        message: source, 
        tone,
        platforms: selectedPlatforms,
        maxCharacters: isTwitterSelected ? 280 : undefined
      }),
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

  async function saveAsDraft() {
    if (!message.trim()) return;
    setSaving(true);
    const mediaUrls = media.filter((m) => selectedMedia.includes(m.id)).map((m) => m.url);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        content: message, 
        status: "DRAFT", 
        title: `Draft - ${new Date().toLocaleDateString()}`, 
        mediaUrls,
        selectedSocialAccountIds: publishAccountIds
      }),
    });
    if (res.ok) {
      toast({
        title: "Saved",
        description: "Post saved as draft",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
    }
    setSaving(false);
  }

  async function publishToAll() {
    if (publishAccountIds.length === 0 || !message.trim()) return;
    setPublishing(true);
    setPublishResult("");
    const mediaUrls = media.filter((m) => selectedMedia.includes(m.id)).map((m) => m.url);

    const createRes = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: message,
        status: "DRAFT",
        title: `Post - ${new Date().toLocaleDateString()}`,
        mediaUrls,
        selectedSocialAccountIds: publishAccountIds,
      }),
    });
    const created = await createRes.json();
    if (!createRes.ok || !created?.id) {
      toast({
        title: "Error",
        description: created?.error || "Failed to create post for publishing.",
        variant: "destructive",
      });
      setPublishing(false);
      return;
    }

    const publishRes = await fetch(`/api/posts/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "publish",
        content: message,
        mediaUrls,
        selectedSocialAccountIds: publishAccountIds,
      }),
    });
    const publishData = await publishRes.json();
    if (publishRes.ok) {
      toast({
        title: "Success",
        description: "Post published to selected social accounts.",
      });
      router.push("/posts");
    } else {
      toast({
        title: "Publish failed",
        description: publishData?.error || "Unknown error occurred.",
        variant: "destructive",
      });
    }
    setPublishing(false);
  }

  async function scheduleAllPosts() {
    if (!scheduleDate || !scheduleTime) {
      toast({
        title: "Missing info",
        description: "Please select both date and time.",
        variant: "destructive",
      });
      return;
    }
    setScheduling(true);
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
    const mediaUrls = media.filter((m) => selectedMedia.includes(m.id)).map((m) => m.url);
    
    const content = message || prompt;
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
        selectedSocialAccountIds: publishAccountIds,
      }),
    });

    if (res.ok) {
      toast({
        title: "Success",
        description: `Content scheduled for ${scheduleDate} at ${scheduleTime}`,
      });
      router.push("/posts");
    } else {
      const data = await res.json();
      toast({
        title: "Scheduling failed",
        description: data.error || "Failed to schedule content.",
        variant: "destructive",
      });
    }
    setScheduling(false);
  }

  async function sendNow() {
    const content = message || prompt;
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
              className="min-h-24 rounded-xl border-gray-200 focus:border-violet-400 resize-none text-foreground"
            />
          </div>

          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Compose Message</Label>
            <Textarea
              placeholder="Write your message (or generate then refine with AI)... e.g. 'Hello {{firstName}}, check out our new arrivals!'"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-28 rounded-xl border-gray-200 focus:border-violet-400 resize-none text-foreground"
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
                <SelectTrigger className="rounded-xl border-gray-200 h-11 text-foreground">
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

      

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>Review & Edit Final Post</h3>
          <span className="text-xs text-gray-400">Character count: {message.length}</span>
        </div>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Finalize your generated content here before publishing..."
          className="min-h-40 rounded-xl border-gray-200 focus:border-violet-400 shadow-inner bg-gray-50/10 text-black"
        />
        <p className="text-[10px] text-gray-400 mt-2">
          Tip: You can edit this text directly. All previews below will update in real-time.
        </p>
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
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{message || prompt}</p>
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
        <h3 className="font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>Finalize & Publish</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">Select Accounts for Publishing</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {socialAccounts.map((account) => (
                <label key={`publish-${account.id}`} className="flex items-center gap-2 text-sm text-gray-700 border border-gray-200 rounded-lg p-2 bg-gray-50/50">
                  <input
                    type="checkbox"
                    checked={publishAccountIds.includes(account.id)}
                    onChange={() => toggleAccount(account.id)}
                  />
                  <span className="truncate text-xs font-medium">{account.accountName}</span>
                  <span className="text-[10px] text-gray-400 uppercase">{account.platform}</span>
                </label>
              ))}
              {socialAccounts.length === 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 col-span-full">
                  No connected social accounts found.
                </p>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              onClick={publishToAll}
              disabled={publishing || publishAccountIds.length === 0 || !message.trim()}
              className="brand-gradient-bg text-white border-0 hover:opacity-90 px-8 h-11 rounded-xl font-semibold"
            >
              {publishing ? "Publishing..." : "Publish to All Selected Accounts"}
            </Button>
            <Button
              onClick={saveAsDraft}
              disabled={saving || !message.trim()}
              variant="outline"
              className="px-8 h-11 rounded-xl font-semibold border-gray-200"
            >
              {saving ? "Saving..." : "Save as Draft"}
            </Button>
          </div>
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
                  className="rounded-xl h-11 text-black"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Time</Label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="rounded-xl h-11 text-black"
                />
              </div>
            </div>
            <Button 
              onClick={scheduleAllPosts} 
              disabled={scheduling || !scheduleDate || !scheduleTime || publishAccountIds.length === 0}
              className="bg-blue-600 text-white border-0 hover:bg-blue-700 px-8 h-11 rounded-xl font-semibold w-full md:w-auto"
            >
              <HiCalendar className="mr-2" />
              {scheduling ? "Scheduling..." : "Confirm Schedule for All Selected Accounts"}
            </Button>
          </div>
        )}
      </div>

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
