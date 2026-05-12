"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FaFacebook, FaInstagram, FaLinkedin, FaTiktok, FaYoutube, FaWhatsapp } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { HiPencil, HiChartBar, HiCalendar, HiUsers, HiShieldCheck, HiLightningBolt, HiCheck, HiSparkles } from "react-icons/hi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Bright modern color palette – NO PURPLE, NO BLUE. Neon coral, mango, lime, electric pink, amber
const BRIGHT_PRIMARY = "#FF6B4A";    // vibrant coral
const BRIGHT_SECONDARY = "#F9A826";  // warm mango
const BRIGHT_ACCENT = "#FF4D6D";     // electric pink
const BRIGHT_GREEN = "#2DC653";      // lime pop
const BRIGHT_ORANGE = "#FF9F1C";
const BRIGHT_YELLOW = "#FFD166";
const GOLDEN = "#FFB347";

const TYPEWRITER_WORDS = [
  "Social Media Presence",
  "Brand Awareness",
  "Audience Engagement",
  "Content Strategy",
  "AI-Powered Growth",
];

// Updated feature colors – bright, energetic, no blue/purple
const FEATURES = [
  {
    icon: HiPencil,
    title: "AI Content Generation",
    desc: "Generate platform-perfect posts with GPT-5. Tailored tone and format for every channel.",
    color: "#FF6B4A",
  },
  {
    icon: HiCalendar,
    title: "Smart Scheduling",
    desc: "Schedule posts at optimal times. Our AI analyzes your audience for maximum reach.",
    color: "#F9A826",
  },
  {
    icon: HiChartBar,
    title: "Deep Analytics",
    desc: "Track followers, engagement, reach, and conversions across all platforms in real-time.",
    color: "#FF4D6D",
  },
  {
    icon: HiUsers,
    title: "Audience Segmentation",
    desc: "Build targeted contact lists, import CSVs, and send personalized email campaigns.",
    color: "#2DC653",
  },
  {
    icon: HiLightningBolt,
    title: "Multi-Platform Publishing",
    desc: "Publish simultaneously to Facebook, X, Instagram, LinkedIn, TikTok, YouTube, and WhatsApp.",
    color: "#FF9F1C",
  },
  {
    icon: HiShieldCheck,
    title: "Enterprise Security",
    desc: "Role-based access control, JWT auth, and rate limiting. Built for teams of any size.",
    color: "#FFB347",
  },
];

// Floating icons – keep original positions & colors (brand colors for each platform)
const SOCIAL_ICONS = [
  { Icon: FaFacebook, color: "#1877F2", label: "Facebook", className: "float-1 top-16 left-8" },
  { Icon: FaXTwitter, color: "#000000", label: "X", className: "float-2 top-32 right-12" },
  { Icon: FaInstagram, color: "#E1306C", label: "Instagram", className: "float-3 bottom-48 left-16" },
  { Icon: FaLinkedin, color: "#0A66C2", label: "LinkedIn", className: "float-4 top-48 left-1/4" },
  { Icon: FaTiktok, color: "#000000", label: "TikTok", className: "float-5 bottom-32 right-8" },
  { Icon: FaYoutube, color: "#FF0000", label: "YouTube", className: "float-6 top-20 right-1/4" },
  { Icon: FaWhatsapp, color: "#25D366", label: "WhatsApp", className: "float-7 bottom-20 left-1/3" },
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
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    fetch("/api/plans")
      .then((res) => res.json())
      .then((data) => {
        setPlans(Array.isArray(data) ? data : []);
        setLoadingPlans(false);
      })
      .catch((err) => {
        console.error("Failed to fetch plans:", err);
        setLoadingPlans(false);
      });
  }, []);

  return (
    <div className="min-h-screen paper-bg overflow-x-hidden">
      {/* Navbar – modern glass with bright accents */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-[#FFF9F0]/90 border-b border-orange-100/70 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-heading font-700 text-xl text-gray-900" style={{ fontWeight: 700 }}>
            Amplify<span className="brand-gradient-text">Hub</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-700">
          <a href="#features" className="hover:text-[#FF6B4A] transition-colors duration-200">Features</a>
          <a href="#pricing" className="hover:text-[#FF6B4A] transition-colors duration-200">Pricing</a>
          <a href="#platforms" className="hover:text-[#FF6B4A] transition-colors duration-200">Platforms</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login">
            <Button variant="ghost" className="text-sm font-medium text-gray-700 hover:text-[#FF6B4A] hover:bg-orange-50/50 rounded-xl transition-all">
              Sign In
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button className="brand-gradient-bg text-white border-0 hover:shadow-lg hover:scale-[1.02] transition-all shadow-md text-sm font-semibold px-5 py-2 rounded-xl">
              Get Started Free
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-20 overflow-hidden">
        {/* Bright modern background orbs – warm coral, mango, lime, no blues/purples */}
        <div className="orb w-96 h-96 bg-[#FF6B4A] top-10 -left-20" style={{ opacity: 0.12 }} />
        <div className="orb w-80 h-80 bg-[#F9A826] top-1/3 right-0" style={{ opacity: 0.1 }} />
        <div className="orb w-64 h-64 bg-[#FF4D6D] bottom-20 left-1/4" style={{ opacity: 0.08 }} />
        <div className="orb w-72 h-72 bg-[#2DC653] bottom-10 right-1/3" style={{ opacity: 0.07 }} />

        {/* Floating Social Icons (unchanged but with slight modern glassmorphism) */}
        <div className="absolute inset-0 pointer-events-none">
          {SOCIAL_ICONS.map(({ Icon, color, label, className }) => (
            <div
              key={label}
              className={`absolute ${className} w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl backdrop-blur-sm transition-transform hover:scale-110 duration-300`}
              style={{ background: `${color}18`, border: `1px solid ${color}40`, backdropFilter: "blur(2px)" }}
            >
              <Icon style={{ color, fontSize: "1.8rem" }} />
            </div>
          ))}
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto px-6 pt-12">
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight text-gray-900">
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
                className="brand-gradient-bg text-white border-0 hover:shadow-xl hover:scale-[1.02] transition-all shadow-md px-8 py-6 text-base font-bold rounded-xl"
              >
                Start Free Today
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-[#FF9F1C] text-[#FF6B4A] bg-white/60 hover:bg-[#FFF2E0] px-8 py-6 text-base font-semibold rounded-xl transition-all"
              >
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Platforms Section – bright card style */}
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
                className="flex items-center gap-3 px-6 py-4 rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-orange-50/40 hover:shadow-md hover:scale-[1.02] transition-all duration-200 group cursor-default"
              >
                <Icon style={{ color, fontSize: "1.8rem" }} />
                <span className="font-semibold text-gray-700 group-hover:text-gray-900">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section – bright modern cards, no blues/purples */}
      <section id="features" className="py-20 paper-bg">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Modern Marketers
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Built with AI at the core, every feature is designed to save you time and drive measurable results.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-6 border border-orange-50/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${color}20` }}
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

      {/* Pricing Section – Updated to match Billing page */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>
              Plans for Every Stage of Growth
            </h2>
          </div>

          {loadingPlans ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-3xl h-96 animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan, idx) => {
                const gradients = ["from-blue-500 to-violet-500", "from-violet-500 to-pink-500", "from-pink-500 to-red-500"];
                const isPopular = idx === 1; // Middle plan is usually popular

                return (
                  <div
                    key={plan.id}
                    className={`relative bg-white rounded-3xl border p-8 transition-all duration-300 ${
                      isPopular ? "border-violet-400 shadow-2xl shadow-violet-100 scale-105" : "border-gray-200 hover:shadow-lg"
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <Badge className="brand-gradient-bg text-white border-0 px-4 py-1 font-bold shadow-md rounded-full text-sm">
                          Most Popular
                        </Badge>
                      </div>
                    )}

                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[idx % gradients.length]} flex items-center justify-center mb-6`}>
                      <HiSparkles className="text-white text-xl" />
                    </div>

                    <h3 className="text-2xl font-black text-gray-900 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>{plan.name}</h3>
                    <p className="text-sm text-gray-500 mb-6">{plan.description}</p>

                    <div className="flex items-baseline gap-1 mb-8">
                      <span className="text-5xl font-black brand-gradient-text" style={{ fontFamily: "Outfit, sans-serif" }}>
                        ${plan.price}
                      </span>
                      <span className="text-gray-400">/mo</span>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((f: string) => (
                        <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${gradients[idx % gradients.length]} flex items-center justify-center flex-shrink-0`}>
                            <HiCheck className="text-white text-[10px]" />
                          </div>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <div className="space-y-2 text-xs text-gray-400 mb-8 bg-gray-50 rounded-2xl p-4">
                      <div className="flex justify-between">
                        <span>Posts/month</span>
                        <span className="font-semibold text-gray-700">{plan.postsPerMonth >= 999999 ? "Unlimited" : plan.postsPerMonth}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>AI Text</span>
                        <span className="font-semibold text-gray-700">{plan.aiTextLimit >= 999999 ? "Unlimited" : plan.aiTextLimit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>AI Image</span>
                        <span className="font-semibold text-gray-700">{plan.aiImageLimit >= 999999 ? "Unlimited" : plan.aiImageLimit}</span>
                      </div>
                    </div>

                    <Link href="/auth/register" className="block">
                      <Button
                        className={`w-full font-bold rounded-xl py-6 transition-all ${
                          isPopular
                            ? "brand-gradient-bg text-white border-0 hover:shadow-lg hover:scale-[1.02]"
                            : "border-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        Get Started
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section – bright coral/orange gradient, no purple/blue */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B4A] via-[#FF8C42] to-[#FF4D6D]"></div>
        <div className="orb w-96 h-96 bg-white/25 top-0 right-0" />
        <div className="orb w-64 h-64 bg-white/15 bottom-0 left-0" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center text-white">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            Ready to Amplify Your Brand?
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Join thousands of marketers who trust AmplifyHub AI to grow their social media presence every day.
          </p>
          <Link href="/auth/register">
            <Button
              size="lg"
              className="bg-white text-[#FF6B4A] hover:bg-amber-50 shadow-xl px-10 py-6 text-base font-bold rounded-xl transition-all hover:scale-[1.02]"
            >
              Start Free — No Credit Card Required
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer – sleek modern dark with bright accent */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-xl">Amplify<span className="text-[#FF9F1C]">Hub</span></span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a href="#" className="hover:text-[#FF9F1C] transition-colors">Privacy</a>
              <a href="#" className="hover:text-[#FF9F1C] transition-colors">Terms</a>
              <a href="#" className="hover:text-[#FF9F1C] transition-colors">Support</a>
              <a href="#" className="hover:text-[#FF9F1C] transition-colors">API</a>
            </div>
            <div className="flex items-center gap-4">
              {[FaFacebook, FaXTwitter, FaInstagram, FaLinkedin].map((Icon, i) => (
                <a key={i} href="#" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#FF6B4A] hover:text-white transition-all group">
                  <Icon className="text-sm text-gray-300 group-hover:text-white" />
                </a>
              ))}
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm">
            © 2026 AmplifyHub AI. All rights reserved. Built for modern marketers.
          </div>
        </div>
      </footer>

      <style jsx>{`
        .typewriter-cursor::after {
          content: "|";
          animation: blink 0.8s infinite;
          margin-left: 2px;
          background: linear-gradient(135deg, #FF6B4A, #F9A826);
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .brand-gradient-bg {
          background: linear-gradient(105deg, #FF7A2F 0%, #FF4D6D 100%);
        }
        .brand-gradient-text {
          background: linear-gradient(135deg, #FF8C42, #FF4D6D, #F9C74F);
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
        }
        .paper-bg {
          background-color: #FFFCF5;
        }
        .float-1 { animation: float1 12s infinite ease-in-out; }
        .float-2 { animation: float2 14s infinite ease-in-out; }
        .float-3 { animation: float3 11s infinite ease-in-out; }
        .float-4 { animation: float4 15s infinite ease-in-out; }
        .float-5 { animation: float5 13s infinite ease-in-out; }
        .float-6 { animation: float6 16s infinite ease-in-out; }
        .float-7 { animation: float7 10s infinite ease-in-out; }
        @keyframes float1 { 0% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-12px) rotate(3deg); } 100% { transform: translateY(0px) rotate(0deg); } }
        @keyframes float2 { 0% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-15px) rotate(-2deg); } 100% { transform: translateY(0px) rotate(0deg); } }
        @keyframes float3 { 0% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-10px) rotate(4deg); } 100% { transform: translateY(0px) rotate(0deg); } }
        @keyframes float4 { 0% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-18px) rotate(-3deg); } 100% { transform: translateY(0px) rotate(0deg); } }
        @keyframes float5 { 0% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-8px) rotate(2deg); } 100% { transform: translateY(0px) rotate(0deg); } }
        @keyframes float6 { 0% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-14px) rotate(-4deg); } 100% { transform: translateY(0px) rotate(0deg); } }
        @keyframes float7 { 0% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-11px) rotate(3deg); } 100% { transform: translateY(0px) rotate(0deg); } }
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          z-index: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}