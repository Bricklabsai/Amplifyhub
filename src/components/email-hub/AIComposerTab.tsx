"use client";
import AIEmailStudio from "@/components/email/AIEmailStudio";
import EmailEnhancer from "@/components/email/EmailEnhancer";

export default function AIComposerTab() {
  return (
    <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
      <div>
        <AIEmailStudio />
      </div>
      <div>
        <EmailEnhancer />
      </div>
    </div>
  );
}
