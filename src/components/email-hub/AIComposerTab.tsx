"use client";
import AIEmailStudio from "@/components/email/AIEmailStudio";
import EmailEnhancer from "@/components/email/EmailEnhancer";

export default function AIComposerTab() {
  return (
    <div className="space-y-6">
      <div className="brand-gradient-bg rounded-2xl p-6 text-white md:p-8">
        <h2
          className="text-2xl font-black md:text-3xl"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          AI Email Studio
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-white/85">
          Write normal client emails or build reusable HTML templates — then send through
          campaigns with your brand colors.
        </p>
      </div>
      <AIEmailStudio />
      <EmailEnhancer />
    </div>
  );
}
