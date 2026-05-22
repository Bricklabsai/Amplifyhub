"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { HiCheck, HiSparkles, HiCreditCard } from "react-icons/hi";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UsageStats } from "@/components/billing/UsageStats";

type BillingTransaction = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  channel: string | null;
  paidAt: string | null;
  createdAt: string;
};

function formatTxDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusBadge(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "success" || normalized === "paid") {
    return { label: "Paid", className: "bg-emerald-100 text-emerald-700" };
  }
  if (normalized === "pending" || normalized === "processing") {
    return { label: "Pending", className: "bg-amber-100 text-amber-800" };
  }
  if (normalized === "cancelled") {
    return { label: "Cancelled", className: "bg-gray-100 text-gray-600" };
  }
  return { label: "Failed", className: "bg-red-100 text-red-700" };
}

function planLabelForAmount(amount: number, plans: { name: string; price: number }[]) {
  const match = plans.find((p) => p.price === amount);
  return match ? `${match.name} Plan` : "Subscription payment";
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<any[]>([]);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const loadBillingData = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const [plansRes, billingRes] = await Promise.all([
        fetch("/api/plans"),
        fetch("/api/billing/info"),
      ]);
      const plansData = plansRes.ok ? await plansRes.json() : [];
      const billingData = billingRes.ok ? await billingRes.json() : {};
      setPlans(Array.isArray(plansData) ? plansData : []);
      setCurrentPlan(billingData.subscription?.plan);
      setTransactions(Array.isArray(billingData.transactions) ? billingData.transactions : []);
    } catch (error) {
      console.error("Failed to load billing data:", error);
    } finally {
      setLoading(false);
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const payment = searchParams.get("payment");
    const error = searchParams.get("error");

    if (payment === "success") {
      setSuccessMessage("🎉 Payment successful! Your plan has been upgraded.");
      void loadBillingData();
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
  }, [searchParams, loadBillingData]);

  useEffect(() => {
    void loadBillingData();
  }, [loadBillingData]);

  const handleUpgrade = async (planId: string) => {
    setUpgradeLoading(planId);
    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();
      const payUrl = data.authorization_url || data.redirectUrl;
      if (payUrl) {
        window.location.href = payUrl;
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
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
            Billing History
          </h3>
          <button
            type="button"
            onClick={() => void loadBillingData()}
            disabled={historyLoading}
            className="text-xs font-semibold text-[#7331FF] hover:underline disabled:opacity-50"
          >
            {historyLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {historyLoading && transactions.length === 0 ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-50" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-500">
            No payments yet. Upgrade to a paid plan to see your billing history here.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {transactions.map((tx) => {
              const badge = statusBadge(tx.status);
              const displayDate = formatTxDate(tx.paidAt ?? tx.createdAt);
              const amountLabel =
                tx.currency === "USD"
                  ? `$${tx.amount.toFixed(2)}`
                  : `${tx.currency} ${tx.amount.toFixed(2)}`;
              return (
                <div
                  key={tx.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {displayDate} — {planLabelForAmount(tx.amount, plans)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {tx.channel ? `Via ${tx.channel}` : "Paynow"}
                      {" · "}
                      Ref {tx.reference.slice(0, 24)}
                      {tx.reference.length > 24 ? "…" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">{amountLabel}</span>
                    <Badge className={`border-0 text-xs ${badge.className}`}>{badge.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
