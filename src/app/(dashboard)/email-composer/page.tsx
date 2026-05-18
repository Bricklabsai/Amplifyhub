"use client";
import AIEmailStudio from "@/components/email/AIEmailStudio";
import EmailEnhancer from "@/components/email/EmailEnhancer";

export default function EmailComposePage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div>
          <AIEmailStudio />
        </div>
        <div>
          <EmailEnhancer />
        </div>
      </div>
    </div>
  );
}
