"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HiEye, HiEyeOff, HiMail, HiLockClosed, HiUser } from "react-icons/hi";
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const SOCIAL_ICONS = [
  { Icon: FaFacebook, color: "#1877F2", className: "top-[8%] right-[12%]" },
  { Icon: FaXTwitter, color: "#1a1a1a", className: "top-[25%] left-[10%]" },
  { Icon: FaInstagram, color: "#E1306C", className: "bottom-[20%] right-[15%]" },
  { Icon: FaLinkedin, color: "#0A66C2", className: "bottom-[10%] left-[8%]" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Registration failed");
      setLoading(false);
    } else {
      router.push("/auth/login?registered=1");
    }
  }

  return (
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
            <h2 className="text-2xl font-bold text-white">Create Account</h2>
            <p className="text-white/80 text-sm mt-1">Get started with AmplifyHub</p>
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
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</Label>
                <div className="relative">
                  <HiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                  <Input
                    id="name"
                    placeholder="John Smith"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="pl-10 h-11 rounded-xl border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 bg-gray-50/50 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
                <div className="relative">
                  <HiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="pl-10 h-11 rounded-xl border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 bg-gray-50/50 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                <div className="relative">
                  <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                  <Input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="pl-10 pr-10 h-11 rounded-xl border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 bg-gray-50/50 transition-all"
                    required
                    minLength={8}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPwd(!showPwd)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPwd ? <HiEyeOff className="text-lg" /> : <HiEye className="text-lg" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Minimum 8 characters</p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-blue-600 via-violet-600 to-pink-600 hover:opacity-90 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-violet-200"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Creating account...
                  </span>
                ) : "Create Free Account"}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          </div>

          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-semibold text-violet-600 hover:text-violet-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
