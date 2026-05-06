"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FaFacebook, FaInstagram, FaLinkedin, FaTiktok, FaYoutube, FaWhatsapp } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { HiPencil, HiChartBar, HiCalendar, HiUsers, HiShieldCheck, HiLightningBolt } from "react-icons/hi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TYPEWRITER_WORDS = [
  "Social Media Presence",
  "Brand Awareness",
  "Audience Engagement",
  "Content Strategy",
  "AI-Powered Growth",
];

const FEATURES = [
  {
    icon: HiPencil,
    title: "AI Content Generation",
    desc: "Generate platform-perfect posts with GPT-5. Tailored tone and format for every channel.",
    color: "#7c3aed",
  },
  {
    icon: HiCalendar,
    title: "Smart Scheduling",
    desc: "Schedule posts at optimal times. Our AI analyzes your audience for maximum reach.",
    color: "#2563eb",
  },
  {
    icon: HiChartBar,
    title: "Deep Analytics",
    desc: "Track followers, engagement, reach, and conversions across all platforms in real-time.",
    color: "#db2777",
  },
  {
    icon: HiUsers,
    title: "Audience Segmentation",
    desc: "Build targeted contact lists, import CSVs, and send personalized email campaigns.",
    color: "#059669",
  },
  {
    icon: HiLightningBolt,
    title: "Multi-Platform Publishing",
    desc: "Publish simultaneously to Facebook, X, Instagram, LinkedIn, TikTok, YouTube, and WhatsApp.",
    color: "#d97706",
  },
  {
    icon: HiShieldCheck,
    title: "Enterprise Security",
    desc: "Role-based access control, JWT auth, and rate limiting. Built for teams of any size.",
    color: "#0891b2",
  },
];

const SOCIAL_ICONS = [
  { Icon: FaFacebook, color: "#1877F2", label: "Facebook", className: "float-1 top-16 left-8" },
  { Icon: FaXTwitter, color: "#000000", label: "X", className: "float-2 top-32 right-12" },
  { Icon: FaInstagram, color: "#E1306C", label: "Instagram", className: "float-3 bottom-48 left-16" },
  { Icon: FaLinkedin, color: "#0A66C2", label: "LinkedIn", className: "float-4 top-48 left-1/4" },
  { Icon: FaTiktok, color: "#000000", label: "TikTok", className: "float-5 bottom-32 right-8" },
  { Icon: FaYoutube, color: "#FF0000", label: "YouTube", className: "float-6 top-20 right-1/4" },
  { Icon: FaWhatsapp, color: "#25D366", label: "WhatsApp", className: "float-7 bottom-20 left-1/3" },
];

const PLANS = [
  { name: "Basic", price: "$9.99", period: "/mo", highlight: false, features: ["5 social accounts", "30 posts/month", "50 AI credits", "Basic analytics"] },
  { name: "Pro", price: "$29.99", period: "/mo", highlight: true, features: ["15 social accounts", "150 posts/month", "300 AI credits", "Advanced analytics", "Campaign management", "Priority support"] },
  { name: "Corporate", price: "$99.99", period: "/mo", highlight: false, features: ["Unlimited accounts", "Unlimited posts", "Unlimited AI credits", "Full analytics suite", "API access", "Dedicated manager"] },
];

function TypewriterText() {
  const [wordIdx, setWordIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = TYPEWRITER_WORDS[wordIdx];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && displayed.length < word.length) {
      timeout = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 60);
    } else if (!deleting && displayed.length === word.length) {
      timeout = setTimeout(() => setDeleting(true), 2000);
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 30);
    } else if (deleting && displayed.length === 0) {
      setDeleting(false);
      setWordIdx((i) => (i + 1) % TYPEWRITER_WORDS.length);
    }

    return () => clearTimeout(timeout);
  }, [displayed, deleting, wordIdx]);

  return (
    <span className="brand-gradient-text typewriter-cursor">{displayed}</span>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen paper-bg overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-[#fcfbf9]/80 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="font-heading font-700 text-xl text-gray-900" style={{ fontWeight: 700 }}>
            Amplify<span className="brand-gradient-text">Hub</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
          <a href="#features" className="hover:text-violet-600 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-violet-600 transition-colors">Pricing</a>
          <a href="#platforms" className="hover:text-violet-600 transition-colors">Platforms</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login">
            <Button variant="ghost" className="text-sm font-medium hover:text-violet-600">Sign In</Button>
          </Link>
          <Link href="/auth/register">
            <Button className="brand-gradient-bg text-white border-0 hover:opacity-90 shadow-md text-sm font-medium">
              Get Started Free
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-20 overflow-hidden">
        {/* Background Orbs */}
        <div className="orb w-96 h-96 bg-blue-400 top-10 -left-20" style={{ opacity: 0.12 }} />
        <div className="orb w-80 h-80 bg-violet-500 top-1/3 right-0" style={{ opacity: 0.1 }} />
        <div className="orb w-64 h-64 bg-pink-400 bottom-20 left-1/4" style={{ opacity: 0.08 }} />

        {/* Floating Social Icons */}
        <div className="absolute inset-0 pointer-events-none">
          {SOCIAL_ICONS.map(({ Icon, color, label, className }) => (
            <div
              key={label}
              className={`absolute ${className} w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl`}
              style={{ background: `${color}18`, border: `1px solid ${color}30` }}
            >
              <Icon style={{ color, fontSize: "1.8rem" }} />
            </div>
          ))}
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto px-6 pt-12">
          
          <h1
            className="text-5xl md:text-7xl font-black mb-6 leading-tight text-gray-900"
           
          >
            Amplify Your
            <br />
            <TypewriterText />
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Create stunning AI-generated content, schedule posts across your social media platforms,
            analyze performance, and grow your audience — all from one beautiful dashboard.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register">
              <Button
                size="lg"
                className="brand-gradient-bg text-white border-0 hover:opacity-90 shadow-xl px-8 py-6 text-base font-semibold rounded-xl"
              >
                Start Free Today
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-violet-200 text-violet-700 hover:bg-violet-50 px-8 py-6 text-base font-semibold rounded-xl"
              >
                View Demo
              </Button>
            </Link>
          </div>

          {/* Social proof */}
          {/* <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-500">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">10K+</div>
              <div>Active Users</div>
            </div>
            <div className="hidden sm:block w-px h-8 bg-gray-200" />
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">50M+</div>
              <div>Posts Published</div>
            </div>
            <div className="hidden sm:block w-px h-8 bg-gray-200" />
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">7</div>
              <div>Platforms Supported</div>
            </div>
          </div> */}
        </div>
      </section>

      {/* Platforms Section */}
      <section id="platforms" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Every Platform. One Dashboard.
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Manage all your social channels from a single, beautifully unified interface.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {[
              { Icon: FaFacebook, color: "#1877F2", name: "Facebook" },
              { Icon: FaXTwitter, color: "#000000", name: "X (Twitter)" },
              { Icon: FaInstagram, color: "#E1306C", name: "Instagram" },
              { Icon: FaLinkedin, color: "#0A66C2", name: "LinkedIn" },
              { Icon: FaTiktok, color: "#000000", name: "TikTok" },
              { Icon: FaYoutube, color: "#FF0000", name: "YouTube" },
              { Icon: FaWhatsapp, color: "#25D366", name: "WhatsApp" },
            ].map(({ Icon, color, name }) => (
              <div
                key={name}
                className="flex items-center gap-3 px-6 py-4 rounded-2xl border border-gray-100 bg-gray-50 hover:shadow-md transition-all group"
              >
                <Icon style={{ color, fontSize: "1.8rem" }} />
                <span className="font-semibold text-gray-700 group-hover:text-gray-900">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 paper-bg">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700 border-blue-200 font-medium">Everything You Need</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Modern Marketers
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Built with AI at the core, every feature is designed to save you time and drive measurable results.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all group"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${color}15` }}
                >
                  <Icon style={{ color, fontSize: "1.5rem" }} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-pink-100 text-pink-700 border-pink-200 font-medium">Simple Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Plans for Every Stage of Growth
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PLANS.map(({ name, price, period, highlight, features }) => (
              <div
                key={name}
                className={`relative rounded-3xl p-8 border transition-all ${
                  highlight
                    ? "border-violet-400 shadow-2xl shadow-violet-100 scale-105"
                    : "border-gray-200 hover:shadow-lg"
                }`}
              >
                {highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="brand-gradient-bg text-white border-0 px-4 py-1 font-semibold">Most Popular</Badge>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black brand-gradient-text">{price}</span>
                    <span className="text-gray-500">{period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-violet-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/register">
                  <Button
                    className={`w-full font-semibold rounded-xl py-5 ${
                      highlight
                        ? "brand-gradient-bg text-white border-0 hover:opacity-90"
                        : "bg-gray-50 text-gray-900 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="brand-gradient-bg absolute inset-0" />
        <div className="orb w-96 h-96 bg-white/20 top-0 right-0" />
        <div className="orb w-64 h-64 bg-white/10 bottom-0 left-0" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center text-white">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            Ready to Amplify Your Brand?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join thousands of marketers who trust AmplifyHub AI to grow their social media presence every day.
          </p>
          <Link href="/auth/register">
            <Button
              size="lg"
              className="bg-white text-violet-700 hover:bg-white/90 shadow-xl px-10 py-6 text-base font-bold rounded-xl"
            >
              Start Free — No Credit Card Required
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">AmplifyHub AI</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
              <a href="#" className="hover:text-white transition-colors">API</a>
            </div>
            <div className="flex items-center gap-4">
              {[FaFacebook, FaXTwitter, FaInstagram, FaLinkedin].map((Icon, i) => (
                <a key={i} href="#" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors">
                  <Icon className="text-sm text-gray-300" />
                </a>
              ))}
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm">
            © 2024 AmplifyHub AI. All rights reserved. Built with ❤️ for modern marketers.
          </div>
        </div>
      </footer>
    </div>
  );
}
