"use client";
import { useState, useEffect } from "react";
import { HiCheck, HiSparkles, HiCreditCard } from "react-icons/hi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function BillingPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/plans").then((r) => r.json()).then((d) => { setPlans(d); setLoading(false); });
  }, []);

  return (
    <div className="max-w-5xl space-y-8">
      {/* Current Plan Banner */}
      <div className="brand-gradient-bg rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <HiCreditCard className="text-xl" />
            <p className="font-semibold text-sm text-white/80">Current Subscription</p>
          </div>
          <h2 className="text-3xl font-black mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>Pro Plan</h2>
          <p className="text-white/70 text-sm">Your subscription renews on May 19, 2024</p>
          <div className="flex items-center gap-3 mt-4">
            <span className="bg-white/20 text-white text-xs font-medium px-3 py-1 rounded-full">✓ Active</span>
            <span className="text-white/60 text-xs">Payment via Stripe</span>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div>
        <h3 className="font-bold text-gray-900 text-xl mb-6" style={{ fontFamily: "Outfit, sans-serif" }}>Available Plans</h3>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3].map((i) => <div key={i} className="bg-white rounded-2xl h-96 animate-pulse border" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, idx) => {
              const isPro = plan.name === "Pro";
              const gradients = ["from-blue-500 to-violet-500", "from-violet-500 to-pink-500", "from-pink-500 to-red-500"];
              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-3xl border p-7 transition-all ${
                    isPro ? "border-violet-400 shadow-2xl shadow-violet-100" : "border-gray-200 hover:shadow-lg"
                  }`}
                >
                  {isPro && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="brand-gradient-bg text-white text-xs font-bold px-4 py-1 rounded-full shadow-md">
                        ⚡ Most Popular
                      </span>
                    </div>
                  )}

                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[idx]} flex items-center justify-center mb-4`}>
                    <HiSparkles className="text-white text-lg" />
                  </div>

                  <h3 className="text-xl font-black text-gray-900 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>{plan.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-black brand-gradient-text" style={{ fontFamily: "Outfit, sans-serif" }}>
                      ${plan.price}
                    </span>
                    <span className="text-gray-400">/mo</span>
                  </div>

                  <ul className="space-y-2.5 mb-7">
                    {plan.features.map((f: string) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                        <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${gradients[idx]} flex items-center justify-center flex-shrink-0`}>
                          <HiCheck className="text-white text-[10px]" />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-2 text-xs text-gray-400 mb-6 bg-gray-50 rounded-xl p-3">
                    <div className="flex justify-between"><span>Posts/month</span><span className="font-semibold text-gray-700">{plan.postsPerMonth >= 999999 ? "Unlimited" : plan.postsPerMonth}</span></div>
                    <div className="flex justify-between"><span>AI Credits</span><span className="font-semibold text-gray-700">{plan.aiCredits >= 999999 ? "Unlimited" : plan.aiCredits}</span></div>
                    <div className="flex justify-between"><span>Platforms</span><span className="font-semibold text-gray-700">{plan.platforms >= 999999 ? "Unlimited" : plan.platforms}</span></div>
                  </div>

                  <Button
                    className={`w-full rounded-xl font-bold py-5 ${
                      isPro
                        ? "brand-gradient-bg text-white border-0 hover:opacity-90"
                        : "border-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => alert(`Stripe integration needed for plan: ${plan.name}`)}
                  >
                    {isPro ? "Upgrade to Pro" : `Switch to ${plan.name}`}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Billing History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>Billing History</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {["Apr 2024", "Mar 2024", "Feb 2024"].map((month, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">{month} — Pro Plan</p>
                <p className="text-xs text-gray-400">Billed monthly</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-900">$29.99</span>
                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Paid</Badge>
                <button className="text-xs text-violet-600 hover:text-violet-700">Download</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
