"use client";
import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface UpgradeError {
  error: string;
  upgradeRequired?: boolean;
  limit?: number;
  current?: number;
}

export function useUpgradeModal() {
  const { toast } = useToast();

  const handleUpgradeRequired = useCallback(
    (feature: "aiText" | "aiImage" | "posts", error: UpgradeError, onOpen?: () => void) => {
      toast({
        title: "Upgrade Required",
        description: error.error,
        variant: "destructive",
      });
      onOpen?.();
    },
    [toast]
  );

  return { handleUpgradeRequired };
}
