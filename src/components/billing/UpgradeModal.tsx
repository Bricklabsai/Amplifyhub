"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HiSparkles, HiArrowRight } from "react-icons/hi";
import { Badge } from "@/components/ui/badge";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: "aiText" | "aiImage" | "posts";
  currentUsage: number;
  limit: number;
  plans: any[];
  onSelectPlan: (planId: string) => void;
}

const featureName = {
  aiText: "AI Text Generation",
  aiImage: "AI Image Generation",
  posts: "Posts",
};

export function UpgradeModal({
  isOpen,
  onClose,
  feature,
  currentUsage,
  limit,
  plans,
  onSelectPlan,
}: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Filter plans for upgrade (exclude free plan if user is on free)
  const upgradePlans = plans.filter((p) => p.price > 0).sort((a, b) => a.price - b.price);

  const handleUpgrade = async (planId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();
      if (data.redirectUrl) {
        // Paynow payment redirect
        window.location.href = data.redirectUrl;
      } else if (data.success) {
        onClose();
        onSelectPlan(planId);
      } else {
        toast({
          title: "Upgrade failed",
          description: data.error || "Could not start the upgrade flow.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      toast({
        title: "Upgrade failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HiSparkles className="text-violet-500" />
            Upgrade to Continue
          </DialogTitle>
          <DialogDescription>
            You've reached your limit for {featureName[feature]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Usage */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Current Usage</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-900">
                {currentUsage}/{limit}
              </span>
              <div className="w-48 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-violet-500 to-pink-500 h-2 rounded-full"
                  style={{ width: `${(currentUsage / limit) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Upgrade Plans */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Available Plans</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {upgradePlans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading}
                  className="relative p-4 border-2 border-gray-200 rounded-xl hover:border-violet-400 transition-all text-left group disabled:opacity-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-bold text-gray-900">{plan.name}</h4>
                      <p className="text-sm text-gray-500">{plan.description}</p>
                    </div>
                    <span className="text-2xl font-black brand-gradient-text">
                      ${plan.price}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600 mb-3">
                    <p>
                      🎯 Posts: {plan.postsPerMonth >= 999999 ? "Unlimited" : plan.postsPerMonth}/mo
                    </p>
                    <p>
                      ✍️ AI Text: {plan.aiTextLimit >= 999999 ? "Unlimited" : plan.aiTextLimit}/mo
                    </p>
                    <p>
                      🖼️ AI Image: {plan.aiImageLimit >= 999999 ? "Unlimited" : plan.aiImageLimit}/mo
                    </p>
                  </div>

                  <Button
                    className="w-full rounded-lg text-sm font-semibold bg-violet-500 hover:bg-violet-600 text-white group-hover:shadow-lg transition-all"
                    disabled={loading}
                  >
                    {loading ? "Processing..." : `Upgrade to ${plan.name}`}
                    <HiArrowRight className="ml-2" />
                  </Button>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <p className="text-xs text-gray-500 text-center">
            You'll be able to generate more content once your subscription is upgraded.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
