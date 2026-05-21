"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HiCheckCircle, HiXCircle } from "react-icons/hi";

// 1. Move all the search params and state logic into a sub-component
function UnsubscribeForm() {
  const params = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing your unsubscribe request...");

  useEffect(() => {
    async function unsubscribe() {
      const email = params.get("email");
      const token = params.get("token");
      if (!email || !token) {
        setStatus("error");
        setMessage("Invalid unsubscribe link.");
        return;
      }
      try {
        const res = await fetch(`/api/email/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
        const data = await res.json();
        setStatus(res.ok && data.success ? "success" : "error");
        setMessage(data.message || "Unable to unsubscribe.");
      } catch (error) {
        console.error(error);
        setStatus("error");
        setMessage("Unable to unsubscribe at this time.");
      }
    }

    unsubscribe();
  }, [params]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-xl rounded-3xl bg-white border border-gray-100 p-10 shadow-xl">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-violet-50 text-violet-600">
            {status === "success" ? <HiCheckCircle className="text-4xl" /> : <HiXCircle className="text-4xl" />}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{status === "success" ? "Unsubscribed" : "Unsubscribe"}</h1>
          <p className="text-sm text-gray-500">{message}</p>
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

// 2. The default export acts as the shell that provides the Suspense context during the build process
export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 px-4 py-16 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading request...</p>
      </div>
    }>
      <UnsubscribeForm />
    </Suspense>
  );
}