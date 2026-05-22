"use client";
import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HiEye, HiEyeOff, HiMail, HiLockClosed } from "react-icons/hi";
import Script from "next/script";
import { AuthCard } from "@/components/auth/AuthCard";
import { authButtonClass, authInputClass, authLinkClass } from "@/components/auth/auth-styles";

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
    } catch {
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
      <AuthCard
        title="Welcome Back"
        subtitle="Sign in to continue"
        footer={
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className={authLinkClass}>
              Sign up free
            </Link>
          </p>
        }
      >
        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
            <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email Address
            </Label>
            <div className="relative">
              <HiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={authInputClass}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <Link
                href="/auth/forgot-password"
                className="text-xs font-medium text-[#7331FF] hover:text-[#5c28d9]"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-gray-400" />
              <Input
                id="password"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${authInputClass} pr-10`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
              >
                {showPwd ? <HiEyeOff className="text-lg" /> : <HiEye className="text-lg" />}
              </button>
            </div>
          </div>

          <div className="flex justify-center rounded-xl border border-[#7331FF]/10 bg-[#7331FF]/5 p-4">
            <div ref={turnstileRef} id="turnstile-widget" />
          </div>

          <Button
            type="submit"
            disabled={loading || !turnstileToken}
            className={authButtonClass}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </AuthCard>
    </>
  );
}
