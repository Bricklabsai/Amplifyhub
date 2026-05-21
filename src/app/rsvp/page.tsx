"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HiCalendar, HiCheckCircle, HiXCircle } from "react-icons/hi";

// 1. Move all logic using useSearchParams and component state into a sub-component
function RSVPForm() {
  const params = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Recording your RSVP...");

  useEffect(() => {
    async function rsvp() {
      const campaignId = params.get("campaignId");
      const recipientId = params.get("recipientId");
      const token = params.get("token");
      if (!campaignId || !recipientId || !token) {
        setStatus("error");
        setMessage("Invalid RSVP link.");
        return;
      }
      try {
        const res = await fetch(`/api/email/rsvp?campaignId=${encodeURIComponent(campaignId)}&recipientId=${encodeURIComponent(recipientId)}&token=${encodeURIComponent(token)}`);
        const data = await res.json();
        setStatus(res.ok && data.success ? "success" : "error");
        setMessage(data.message || "Unable to record your RSVP.");
      } catch (error) {
        console.error(error);
        setStatus("error");
        setMessage("Unable to record your RSVP at this time.");
      }
    }

    rsvp();
  }, [params]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-xl rounded-3xl bg-white border border-gray-100 p-10 shadow-xl">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            {status === "success" ? <HiCheckCircle className="text-4xl" /> : <HiXCircle className="text-4xl" />}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{status === "success" ? "RSVP Confirmed" : "RSVP"}</h1>
          <p className="text-sm text-gray-500">{message}</p>
          {status === "success" && (
            <div className="mt-4 text-sm text-gray-600 flex items-center justify-center gap-2">
              <HiCalendar className="text-base" /> We'll follow up with details soon.
            </div>
          )}
          <div className="mt-6">
            <Button asChild>
              <a href="/" className="rounded-xl">Return to Home</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. The default export acts as the static shell providing the Suspense context during compilation
export default function RSVPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 px-4 py-16 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading your RSVP details...</p>
      </div>
    }>
      <RSVPForm />
    </Suspense>
  );
}