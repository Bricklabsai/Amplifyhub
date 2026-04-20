"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HiMail, HiArrowLeft } from "react-icons/hi";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-violet-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-violet-200/50 border border-violet-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-violet-600 to-pink-600 px-8 py-6 text-center">
            <h2 className="text-2xl font-bold text-white">Reset Password</h2>
            <p className="text-white/80 text-sm mt-1">We&apos;ll help you get back in</p>
          </div>

          <div className="p-8">
            {!sent ? (
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

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-gradient-to-r from-blue-600 via-violet-600 to-pink-600 hover:opacity-90 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-violet-200"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      Sending...
                    </span>
                  ) : "Send Reset Link"}
                </Button>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h3>
                <p className="text-gray-600 text-sm mb-4">
                  We&apos;ve sent a password reset link to <span className="font-medium">{email}</span>
                </p>
              </div>
            )}
          </div>

          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
            <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1 transition-colors">
              <HiArrowLeft className="text-sm" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}