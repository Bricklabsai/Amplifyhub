"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { HiCheck, HiSparkles, HiCreditCard } from "react-icons/hi";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UsageStats } from "@/components/billing/UsageStats";

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<any[]>([]);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const loadBillingData = async () => {
    try {
      const [plansData, billingData] = await Promise.all([
        fetch("/api/plans").then((r) => r.json()),
        fetch("/api/billing/info").then((r) => r.json()),
      ]);
      setPlans(plansData);
      setCurrentPlan(billingData.subscription?.plan);
    } catch (error) {
      console.error("Failed to load billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for callback results
    const payment = searchParams.get("payment");
    const error = searchParams.get("error");

    if (payment === "success") {
      setSuccessMessage("🎉 Payment successful! Your plan has been upgraded.");
      // Clear message after 5 seconds
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }

    if (error) {
      const errorMessages: Record<string, string> = {
        "no-reference": "No payment reference found. Please try again.",
        "transaction-not-found": "Transaction not found. Please contact support.",
        "payment-failed": "Payment verification failed. Please try again.",
        "verification-failed": "Payment verification failed. Please try again.",
        "callback-error": "An error occurred during payment processing.",
      };
      setErrorMessage(errorMessages[error] || `Payment error: ${error}`);
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  useEffect(() => {
    loadBillingData();
  }, []);

  const handleUpgrade = async (planId: string) => {
    setUpgradeLoading(planId);
    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else if (data.success) {
        // Free plan - refresh page to show new subscription
        setSuccessMessage("✓ You've successfully upgraded to the free plan!");
        await loadBillingData();
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        toast({
          title: "Payment initialization failed",
          description: data.error || "Failed to initialize payment.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      toast({
        title: "Upgrade failed",
        description: error instanceof Error ? error.message : "Failed to process upgrade.",
        variant: "destructive",
      });
    } finally {
      setUpgradeLoading(null);
    }
  };

  return (
    <div className="max-w-6xl space-y-8">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 flex items-center gap-3">
          <span className="text-xl">✓</span>
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800 flex items-center gap-3">
          <span className="text-xl">✕</span>
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Usage Stats */}
      <div>
        <h3 className="font-bold text-gray-900 text-xl mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>Your Usage</h3>
        <UsageStats />
      </div>

      {/* Current Plan Banner */}
      <div className="brand-gradient-bg rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <HiCreditCard className="text-xl" />
            <p className="font-semibold text-sm text-white/80">Current Subscription</p>
          </div>
          <h2 className="text-3xl font-black mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
            {currentPlan?.name || "Loading..."}
          </h2>
          <p className="text-white/70 text-sm">{currentPlan?.description}</p>
          <div className="flex items-center gap-3 mt-4">
            <span className="bg-white/20 text-white text-xs font-medium px-3 py-1 rounded-full">✓ Active</span>
            {currentPlan?.price === 0 && (
              <span className="text-white/60 text-xs">Free forever plan</span>
            )}
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
              const isCurrent = currentPlan?.id === plan.id;
              const gradients = ["from-blue-500 to-violet-500", "from-violet-500 to-pink-500", "from-pink-500 to-red-500"];
              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-3xl border p-7 transition-all ${
                    isCurrent ? "border-violet-400 shadow-2xl shadow-violet-100" : "border-gray-200 hover:shadow-lg"
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="brand-gradient-bg text-white text-xs font-bold px-4 py-1 rounded-full shadow-md">
                        ✓ Current Plan
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
                    <div className="flex justify-between"><span>AI Text</span><span className="font-semibold text-gray-700">{plan.aiTextLimit >= 999999 ? "Unlimited" : plan.aiTextLimit}</span></div>
                    <div className="flex justify-between"><span>AI Image</span><span className="font-semibold text-gray-700">{plan.aiImageLimit >= 999999 ? "Unlimited" : plan.aiImageLimit}</span></div>
                  </div>

                  <Button
                    className={`w-full rounded-xl font-bold py-5 ${
                      isCurrent
                        ? "brand-gradient-bg text-white border-0 opacity-50 cursor-default hover:opacity-50"
                        : "border-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isCurrent || upgradeLoading === plan.id}
                  >
                    {isCurrent ? "Current Plan" : (upgradeLoading === plan.id ? "Processing..." : `Upgrade to ${plan.name}`)}
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
