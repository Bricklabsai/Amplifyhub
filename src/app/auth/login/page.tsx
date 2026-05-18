"use client";
import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HiEye, HiEyeOff, HiMail, HiLockClosed } from "react-icons/hi";
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import Script from "next/script";

const SOCIAL_ICONS = [
  { Icon: FaFacebook, color: "#1877F2", className: "top-[10%] left-[8%]" },
  { Icon: FaXTwitter, color: "#1a1a1a", className: "top-[20%] right-[10%]" },
  { Icon: FaInstagram, color: "#E1306C", className: "bottom-[25%] left-[12%]" },
  { Icon: FaLinkedin, color: "#0A66C2", className: "bottom-[15%] right-[8%]" },
];

export default function LoginPage() {
  const router = useRouter();
  const turnstileRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(false);

  useEffect(() => {
    const checkTurnstile = setInterval(() => {
      if (typeof window !== "undefined" && (window as any).turnstile) {
        setTurnstileReady(true);
        clearInterval(checkTurnstile);
      }
    }, 100);

    return () => clearInterval(checkTurnstile);
  }, []);

  useEffect(() => {
    if (turnstileReady && turnstileRef.current && !(window as any).turnstile?.isInitialized) {
      (window as any).turnstile?.render(`#turnstile-widget`, {
        sitekey: process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY,
        theme: "light",
        callback: (token: string) => {
          setTurnstileToken(token);
        },
        "error-callback": () => {
          setError("Failed to load security challenge. Please refresh the page.");
        },
      });
      (window as any).turnstile.isInitialized = true;
    }
  }, [turnstileReady]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!turnstileToken) {
      setError("Please complete the security verification");
      setLoading(false);
      return;
    }

    try {
      const verifyRes = await fetch("/api/auth/verify-turnstile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: turnstileToken }),
      });

      if (!verifyRes.ok) {
        setError("Security verification failed. Please try again.");
        (window as any).turnstile?.reset();
        setTurnstileToken(null);
        setLoading(false);
        return;
      }

      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError("Invalid email or password");
        (window as any).turnstile?.reset();
        setTurnstileToken(null);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      (window as any).turnstile?.reset();
      setTurnstileToken(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
        onLoad={() => setTurnstileReady(true)}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-violet-50 to-pink-50 flex items-center justify-center p-4 relative overflow-hidden">
        {SOCIAL_ICONS.map(({ Icon, color, className }) => (
        <div
          key={color}
          className={`absolute ${className} w-16 h-16 rounded-2xl flex items-center justify-center`}
          style={{ 
            background: `${color}15`, 
            border: `1px solid ${color}25`,
            animation: "float 6s ease-in-out infinite"
          }}
        >
          <Icon style={{ color, fontSize: "2rem" }} />
        </div>
      ))}

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
      `}</style>

      <div className="w-full max-w-[420px] relative z-10">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-violet-200/50 border border-violet-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-violet-600 to-pink-600 px-8 py-6 text-center">
            <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
            <p className="text-white/80 text-sm mt-1">Sign in to continue</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
                <div className="relative">
                  <HiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 rounded-xl border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 bg-gray-50/50 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                  <Link href="/auth/forgot-password" className="text-xs text-violet-600 hover:text-violet-700 font-medium">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                  <Input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 rounded-xl border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 bg-gray-50/50 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPwd ? <HiEyeOff className="text-lg" /> : <HiEye className="text-lg" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div ref={turnstileRef} id="turnstile-widget" />
              </div>

              <Button
                type="submit"
                disabled={loading || !turnstileToken}
                className="w-full h-11 bg-gradient-to-r from-blue-600 via-violet-600 to-pink-600 hover:opacity-90 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-violet-200 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Signing in...
                  </span>
                ) : "Sign In"}
              </Button>
            </form>

            {/* <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center mb-3">Quick demo access:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setEmail("demo@amplifyhub.ai"); setPassword("Demo@123456"); }}
                  className="text-xs py-2 px-3 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors font-medium"
                >
                  Demo User
                </button>
                <button
                  onClick={() => { setEmail("admin@amplifyhub.ai"); setPassword("Admin@123456"); }}
                  className="text-xs py-2 px-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-medium"
                >
                  Admin
                </button>
              </div>
            </div> */}
          </div>

          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link href="/auth/register" className="font-semibold text-violet-600 hover:text-violet-700">
                Sign up free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
