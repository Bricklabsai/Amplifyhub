"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, AlertCircle } from "lucide-react";

/**
 * This component is deprecated. WhatsApp integration now uses Zernio's OAuth flow.
 * Users should connect WhatsApp from the Social Accounts page instead.
 */
export function WhatsAppSettingsForm() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect to social accounts page
    const timer = setTimeout(() => {
      router.push("/dashboard/social-accounts");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-[#25D366]" />
          WhatsApp Integration
        </CardTitle>
        <CardDescription>
          WhatsApp is now connected via Zernio's OAuth flow
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-blue-900 mb-1">Integration Updated</p>
            <p className="text-blue-800 mb-3">
              WhatsApp integration has been updated to use Zernio's secure OAuth flow, 
              the same pattern used for Instagram, TikTok, and other platforms.
            </p>
            <p className="text-blue-800 mb-4">
              You can now connect your WhatsApp Business Account directly from the Social Accounts page 
              without manual credential entry.
            </p>
            <div className="space-y-2 text-sm text-blue-700 mb-4">
              <p>✓ Secure OAuth-style connection</p>
              <p>✓ No manual credential management</p>
              <p>✓ Automatic refresh and synchronization</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button 
          onClick={() => router.push("/dashboard/social-accounts")}
          className="w-full brand-gradient-bg text-white border-0 hover:opacity-90 rounded-xl"
        >
          Go to Social Accounts
        </Button>
      </CardFooter>
    </Card>
  );
}
