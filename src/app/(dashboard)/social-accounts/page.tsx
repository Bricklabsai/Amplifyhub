"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { HiPlus, HiTrash, HiCheck } from "react-icons/hi";
import { FaFacebook, FaInstagram, FaLinkedin, FaTiktok, FaYoutube, FaWhatsapp } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { formatNumber } from "@/lib/utils";

const PLATFORM_CONFIG = [
  { id: "FACEBOOK", label: "Facebook", Icon: FaFacebook, color: "#1877F2", bg: "#1877F215" },
  { id: "TWITTER", label: "X (Twitter)", Icon: FaXTwitter, color: "#000000", bg: "#00000015" },
  { id: "INSTAGRAM", label: "Instagram", Icon: FaInstagram, color: "#E1306C", bg: "#E1306C15" },
  { id: "LINKEDIN", label: "LinkedIn", Icon: FaLinkedin, color: "#0A66C2", bg: "#0A66C215" },
  { id: "TIKTOK", label: "TikTok", Icon: FaTiktok, color: "#000000", bg: "#00000015" },
  { id: "YOUTUBE", label: "YouTube", Icon: FaYoutube, color: "#FF0000", bg: "#FF000015" },
  { id: "WHATSAPP", label: "WhatsApp", Icon: FaWhatsapp, color: "#25D366", bg: "#25D36615" },
];

export default function SocialAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [accountName, setAccountName] = useState("");
  const [followers, setFollowers] = useState("1000");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => { fetchAccounts(); }, []);

  async function fetchAccounts() {
    const res = await fetch("/api/social-accounts");
    const data = await res.json();
    setAccounts(data);
    setLoading(false);
  }

  async function connect() {
    if (!selectedPlatform || !accountName) return;
    setConnecting(selectedPlatform);
    await fetch("/api/social-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: selectedPlatform, accountName, followers: parseInt(followers) }),
    });
    await fetchAccounts();
    setConnecting(null);
    setOpen(false);
    setAccountName("");
    setFollowers("1000");
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
        <p className="text-gray-500 text-sm">{accounts.length} connected accounts</p>
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
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">Select Platform</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PLATFORM_CONFIG.map(({ id, label, Icon, color, bg }) => (
                    <button
                      key={id}
                      onClick={() => setSelectedPlatform(id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        selectedPlatform === id ? "border-violet-400 bg-violet-50" : "border-gray-200 bg-gray-50"
                      } ${connectedIds.includes(id) ? "opacity-50" : ""}`}
                      disabled={connectedIds.includes(id)}
                    >
                      <Icon style={{ color, fontSize: "1.5rem" }} />
                      <span className="text-xs font-medium text-gray-600">{label}</span>
                      {connectedIds.includes(id) && <span className="text-xs text-emerald-500">Connected</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Account Name / Handle</Label>
                <Input
                  placeholder="@youraccount"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="rounded-xl border-gray-200 h-11"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Follower Count</Label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={followers}
                  onChange={(e) => setFollowers(e.target.value)}
                  className="rounded-xl border-gray-200 h-11"
                />
              </div>
              <Button
                onClick={connect}
                disabled={!selectedPlatform || !accountName || !!connecting}
                className="w-full brand-gradient-bg text-white border-0 hover:opacity-90 rounded-xl h-11 font-semibold"
              >
                {connecting ? "Connecting..." : "Connect Account"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* All Platforms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORM_CONFIG.map(({ id, label, Icon, color, bg }) => {
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
                  onClick={() => { setSelectedPlatform(id); setOpen(true); }}
                  className="mt-2 text-sm text-violet-600 font-medium hover:text-violet-700 transition-colors"
                >
                  + Connect
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
