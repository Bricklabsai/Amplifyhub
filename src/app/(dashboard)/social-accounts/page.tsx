"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { HiPlus, HiTrash, HiCheck, HiRefresh } from "react-icons/hi";
import { FaFacebook, FaInstagram, FaLinkedin, FaTiktok, FaYoutube, FaWhatsapp } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { formatNumber } from "@/lib/utils";
import { signIn } from "next-auth/react";

type PlatformConfig = {
  id: string;
  label: string;
  Icon: React.ComponentType<{ style?: React.CSSProperties }>;
  color: string;
  bg: string;
  provider: string;
  /** Lowercase identifier consumed by the Zernio Connect API. */
  zernioPlatform?: "facebook" | "twitter" | "instagram" | "linkedin" | "tiktok" | "youtube" | "whatsapp";
};

const PLATFORM_CONFIG: PlatformConfig[] = [
  { id: "FACEBOOK", label: "Facebook", Icon: FaFacebook, color: "#1877F2", bg: "#1877F215", provider: "facebook", zernioPlatform: "facebook" },
  { id: "TWITTER", label: "X (Twitter)", Icon: FaXTwitter, color: "#000000", bg: "#00000015", provider: "twitter", zernioPlatform: "twitter" },
  { id: "INSTAGRAM", label: "Instagram", Icon: FaInstagram, color: "#E1306C", bg: "#E1306C15", provider: "instagram", zernioPlatform: "instagram" },
  { id: "LINKEDIN", label: "LinkedIn", Icon: FaLinkedin, color: "#0A66C2", bg: "#0A66C215", provider: "linkedin", zernioPlatform: "linkedin" },
  { id: "TIKTOK", label: "TikTok", Icon: FaTiktok, color: "#000000", bg: "#00000015", provider: "tiktok", zernioPlatform: "tiktok" },
  { id: "YOUTUBE", label: "YouTube", Icon: FaYoutube, color: "#FF0000", bg: "#FF000015", provider: "google", zernioPlatform: "youtube" },
  // WhatsApp now uses Zernio's OAuth connect flow, same as other platforms
  { id: "WHATSAPP", label: "WhatsApp", Icon: FaWhatsapp, color: "#25D366", bg: "#25D36615", provider: "whatsapp", zernioPlatform: "whatsapp" },
];

export default function SocialAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => { fetchAccounts(); }, []);

  async function fetchAccounts() {
    const res = await fetch("/api/social-accounts");
    const data = await res.json();
    setAccounts(data);
    setLoading(false);
  }

  /**
   * Kicks off the Zernio-hosted OAuth handshake for a platform. Hits
   * /api/connect/zernio to mint a one-time auth URL, then performs a
   * full-page redirect so Zernio can complete the handshake on its side.
   */
  async function connectViaZernio(platform: string) {
    if (!platform) return;
    setConnectingPlatform(platform);
    try {
      const res = await fetch(`/api/connect/zernio?platform=${encodeURIComponent(platform)}`, {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Connect failed (${res.status})`);
      }
      const { url } = (await res.json()) as { url?: string };
      if (!url) throw new Error("Connect URL missing from server response");
      window.location.href = url;
    } catch (err) {
      console.error("Zernio connect failed", err);
      alert(err instanceof Error ? err.message : "Failed to start connection");
      setConnectingPlatform(null);
    }
  }

  function connect(config: PlatformConfig) {
    if (config.zernioPlatform) {
      connectViaZernio(config.zernioPlatform);
      return;
    }
    if (config.provider) {
      signIn(config.provider, { callbackUrl: "/dashboard" });
    }
  }

  async function refreshProfiles() {
    setRefreshing(true);
    try {
      await fetch("/api/social-accounts/refresh", { method: "POST" });
      await fetchAccounts();
    } catch (error) {
      console.error("Failed to refresh profiles", error);
    } finally {
      setRefreshing(false);
    }
  }

  async function disconnect(id: string) {
    if (!confirm("Disconnect this account?")) return;
    await fetch(`/api/social-accounts/${id}`, { method: "DELETE" });
    setAccounts((a) => a.filter((x) => x.id !== id));
  }

  const connectedIds = accounts.map((a) => a.platform);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-gray-500 text-sm">{accounts.length} connected accounts</p>
          {accounts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={refreshProfiles}
              disabled={refreshing}
              className="rounded-xl flex items-center gap-2"
            >
              <HiRefresh className={`text-base ${refreshing ? "animate-spin" : ""}`} />
              Refresh Profiles
            </Button>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="brand-gradient-bg text-white border-0 hover:opacity-90 rounded-xl font-semibold text-sm flex items-center gap-2">
              <HiPlus className="text-base" />
              Connect Account
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "Outfit, sans-serif" }}>Connect Social Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                {PLATFORM_CONFIG.map((config) => {
                  const { id, label, Icon, color, bg, zernioPlatform } = config;
                  const isConnected = connectedIds.includes(id);
                  const isConnecting = connectingPlatform === zernioPlatform;
                  return (
                    <button
                      key={id}
                      onClick={() => connect(config)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all border-gray-100 bg-gray-50 hover:border-violet-200 hover:bg-violet-50/30 ${
                        isConnected || isConnecting ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      disabled={isConnected || isConnecting}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                        <Icon style={{ color, fontSize: "1.25rem" }} />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-semibold text-gray-700 block">{label}</span>
                        {isConnected ? (
                          <span className="text-[10px] text-emerald-500 font-medium">Connected</span>
                        ) : isConnecting ? (
                          <span className="text-[10px] text-violet-500 font-medium">Redirecting…</span>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-medium">Click to connect</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 text-center px-4">
                By connecting your account, you agree to our Terms of Service and Privacy Policy. We will only access the data necessary to provide our services.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* All Platforms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORM_CONFIG.map((config) => {
          const { id, label, Icon, color, bg } = config;
          const account = accounts.find((a) => a.platform === id);
          return (
            <div key={id} className={`bg-white rounded-2xl border p-5 transition-all ${account ? "border-gray-200 shadow-sm" : "border-dashed border-gray-200"}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                  <Icon style={{ color, fontSize: "1.5rem" }} />
                </div>
                {account ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs font-medium flex items-center gap-1">
                    <HiCheck className="text-xs" /> Connected
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-500 border-0 text-xs">Not connected</Badge>
                )}
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>{label}</h3>
              {account ? (
                <>
                  <p className="text-xs text-gray-500 mb-1">{account.accountName}</p>
                  <p className="text-2xl font-black text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {formatNumber(account.followers)}
                  </p>
                  <p className="text-xs text-gray-400">followers</p>
                  <button
                    onClick={() => disconnect(account.id)}
                    className="mt-3 text-xs text-red-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                  >
                    <HiTrash className="text-xs" />
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={() => connect(config)}
                  disabled={connectingPlatform === config.zernioPlatform}
                  className="mt-2 text-sm text-violet-600 font-medium hover:text-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connectingPlatform === config.zernioPlatform ? "Redirecting…" : "+ Connect"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
