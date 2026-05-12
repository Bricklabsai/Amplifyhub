"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HiCheckCircle, HiXCircle, HiRefresh } from "react-icons/hi";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your payment...");

  useEffect(() => {
    if (!reference) {
      setStatus("error");
      setMessage("No reference found in the URL.");
      return;
    }

    const verifyPayment = async () => {
      try {
        const res = await fetch(`/api/payments/verify?reference=${reference}`);
        const data = await res.json();

        if (data.success) {
          setStatus("success");
          setMessage("Payment successful! Your plan has been upgraded.");
          // Redirect to billing page after 3 seconds
          setTimeout(() => {
            router.push("/dashboard/billing");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.message || "Payment verification failed.");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
        setMessage("An error occurred during verification.");
      }
    };

    verifyPayment();
  }, [reference, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      {status === "loading" && (
        <>
          <HiRefresh className="w-16 h-16 text-violet-500 animate-spin" />
          <h2 className="text-2xl font-bold text-gray-900">{message}</h2>
          <p className="text-gray-500">Please do not close this window.</p>
        </>
      )}

      {status === "success" && (
        <>
          <HiCheckCircle className="w-16 h-16 text-emerald-500" />
          <h2 className="text-2xl font-bold text-gray-900">{message}</h2>
          <p className="text-gray-500">Redirecting you back to billing...</p>
        </>
      )}

      {status === "error" && (
        <>
          <HiXCircle className="w-16 h-16 text-red-500" />
          <h2 className="text-2xl font-bold text-gray-900">{message}</h2>
          <button
            onClick={() => router.push("/dashboard/billing")}
            className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
          >
            Back to Billing
          </button>
        </>
      )}
    </div>
  );
}
