"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HiMail, HiArrowLeft } from "react-icons/hi";
import { AuthCard } from "@/components/auth/AuthCard";
import { authButtonClass, authInputClass } from "@/components/auth/auth-styles";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSent(true);
    setLoading(false);
  }

  return (
    <AuthCard
      title="Reset Password"
      subtitle="We'll help you get back in"
      footer={
        <Link
          href="/auth/login"
          className="flex items-center justify-center gap-1 text-sm text-gray-600 transition-colors hover:text-[#7331FF]"
        >
          <HiArrowLeft className="text-sm" />
          Back to Sign In
        </Link>
      }
    >
      {!sent ? (
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

          <Button type="submit" disabled={loading} className={authButtonClass}>
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
                Sending...
              </span>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>
      ) : (
        <div className="py-4 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#7331FF]/10">
            <svg
              className="h-8 w-8 text-[#7331FF]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">Check your email</h3>
          <p className="mb-4 text-sm text-gray-600">
            We&apos;ve sent a password reset link to{" "}
            <span className="font-medium text-[#111318]">{email}</span>
          </p>
        </div>
      )}
    </AuthCard>
  );
}
