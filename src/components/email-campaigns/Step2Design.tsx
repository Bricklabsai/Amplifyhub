"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { HiEye, HiDevicePhoneMobile, HiComputerDesktop, HiPaperAirplane } from "react-icons/hi2";
import TipTapEditor from "./TipTapEditor";

type WizardFormData = {
  name: string;
  subject: string;
  previewText: string;
  htmlContent: string;
};

interface Step2DesignProps {
  form: WizardFormData;
  setForm: (form: WizardFormData) => void;
}

const EMAIL_TEMPLATES = [
  {
    id: "welcome",
    name: "Welcome",
    description: "New customer welcome email",
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #333;">Welcome to AmplifyHub!</h1>
  <p>Hi {{firstName}},</p>
  <p>We're thrilled to have you on board. Get started with our platform and reach your audience like never before.</p>
  <p style="margin-top: 30px;">
    <a href="#" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Get Started</a>
  </p>
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
  <p style="color: #999; font-size: 12px;">© 2026 AmplifyHub. All rights reserved.</p>
</div>`,
  },
  {
    id: "newsletter",
    name: "Newsletter",
    description: "Regular newsletter template",
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333; border-bottom: 3px solid #7c3aed; padding-bottom: 10px;">Latest Updates</h2>
  <h3>Story 1: Amazing Feature Released</h3>
  <p>Learn how our newest feature can transform your workflow...</p>
  <p><a href="#" style="color: #7c3aed; text-decoration: none;">Read more →</a></p>
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
  <h3>Story 2: Customer Spotlight</h3>
  <p>See how {{company}} is using AmplifyHub to succeed...</p>
  <p><a href="#" style="color: #7c3aed; text-decoration: none;">Read more →</a></p>
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
  <p style="color: #999; font-size: 12px;">© 2026 AmplifyHub. All rights reserved.</p>
</div>`,
  },
  {
    id: "promotion",
    name: "Promotion",
    description: "Sales & promotional email",
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); color: white; padding: 40px 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
    <h1 style="margin: 0; font-size: 36px;">SPECIAL OFFER</h1>
    <p style="margin: 10px 0 0 0; font-size: 20px;">50% OFF This Week Only!</p>
  </div>
  <p>Hi {{firstName}},</p>
  <p>Claim your exclusive discount today. Use code <strong>SPECIAL50</strong> at checkout.</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="#" style="background: #7c3aed; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 16px; font-weight: bold;">Shop Now</a>
  </p>
  <p style="color: #999; font-size: 12px;">Offer expires in 7 days.</p>
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
  <p style="color: #999; font-size: 12px;">© 2026 AmplifyHub. All rights reserved.</p>
</div>`,
  },
];

export default function Step2Design({ form, setForm }: Step2DesignProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("desktop");
  const [testEmailSending, setTestEmailSending] = useState(false);

  async function applyTemplate(content: string) {
    setForm({ ...form, htmlContent: content });
  }

  async function sendTestEmail() {
    if (!form.htmlContent.trim()) {
      alert("Please add email content before sending a test");
      return;
    }

    setTestEmailSending(true);
    try {
      const res = await fetch("/api/email-campaigns/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: form.subject || "Test Email",
          htmlContent: form.htmlContent,
          previewText: form.previewText,
        }),
      });

      if (res.ok) {
        alert("Test email sent successfully!");
      } else {
        alert("Failed to send test email");
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      alert("Error sending test email");
    } finally {
      setTestEmailSending(false);
    }
  }

  return (
    <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
      {/* Template Gallery */}
      <div>
        <Label className="text-sm font-semibold text-gray-700 mb-3 block">Email Template Gallery</Label>
        <div className="grid grid-cols-3 gap-3">
          {EMAIL_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => applyTemplate(template.content)}
              className="border border-gray-200 rounded-lg p-3 hover:border-violet-500 hover:bg-violet-50 transition-all text-left"
            >
              <p className="font-semibold text-sm text-gray-900">{template.name}</p>
              <p className="text-xs text-gray-500 mt-1">{template.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Editor and Preview Side by Side */}
      <div className="border-t pt-6">
        <div className="flex justify-between items-center mb-3">
          <Label className="text-sm font-semibold text-gray-700">Email Content *</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            className="rounded-lg h-8 flex items-center gap-1 text-xs"
          >
            <HiEye /> {showPreview ? "Hide Preview" : "Show Preview"}
          </Button>
        </div>

        <div className={`grid gap-3 ${showPreview ? "grid-cols-2" : "grid-cols-1"}`}>
          {/* TipTap Editor */}
          <div>
            <TipTapEditor
              value={form.htmlContent}
              onChange={(html) => setForm({ ...form, htmlContent: html })}
            />
            <p className="text-[10px] text-gray-400 mt-2">
              💡 Tip: Use {"{{firstName}}"}, {"{{lastName}}"}, {"{{email}}"}, {"{{company}}"}, {"{{name}}"}, {"{{rsvpLink}}"}, {"{{unsubscribeUrl}}"}, {"{{currentDate}}"} for personalization
            </p>
          </div>

          {/* Live Preview */}
          {showPreview && (
            <div>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setPreviewMode("desktop")}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg border transition-all ${
                    previewMode === "desktop"
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  <HiComputerDesktop className="text-sm" /> Desktop
                </button>
                <button
                  onClick={() => setPreviewMode("mobile")}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg border transition-all ${
                    previewMode === "mobile"
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  <HiDevicePhoneMobile className="text-sm" /> Mobile
                </button>
              </div>
              <div
                className={`border border-gray-200 rounded-xl overflow-auto bg-gray-50 ${
                  previewMode === "mobile" ? "max-w-xs" : "max-w-full"
                }`}
                style={{ maxHeight: "400px" }}
              >
                <div
                  className="bg-white p-4"
                  dangerouslySetInnerHTML={{
                    __html: form.htmlContent || '<p style="color: #999; text-align: center; padding: 20px;">Email preview will appear here</p>',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Test Email Button */}
        <div className="mt-4">
          <Button
            onClick={sendTestEmail}
            disabled={testEmailSending || !form.htmlContent.trim()}
            variant="outline"
            className="rounded-lg h-10 flex items-center gap-2 text-sm"
          >
            <HiPaperAirplane /> {testEmailSending ? "Sending..." : "Send Test Email"}
          </Button>
          <p className="text-xs text-gray-400 mt-1">Send a test to your email to preview on your device</p>
        </div>
      </div>
    </div>
  );
}
