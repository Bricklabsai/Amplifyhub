"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type WizardFormData = {
  name: string;
  subject: string;
  previewText: string;
  htmlContent: string;
};

interface Step1BasicsProps {
  form: WizardFormData;
  setForm: (form: WizardFormData) => void;
}

export default function Step1Basics({ form, setForm }: Step1BasicsProps) {
  return (
    <div className="space-y-6 py-4">
      <div>
        <Label className="text-sm font-semibold text-gray-700 mb-2 block">Campaign Name *</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-xl h-11"
          placeholder="e.g., Monthly Newsletter, Spring Sale"
        />
        <p className="text-xs text-gray-400 mt-1">Internal name for your reference</p>
      </div>

      <div>
        <Label className="text-sm font-semibold text-gray-700 mb-2 block">Subject Line *</Label>
        <Input
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="rounded-xl h-11"
          placeholder="e.g., Check Out Our Latest Products!"
        />
        <p className="text-xs text-gray-400 mt-1">This is what recipients see in their inbox</p>
      </div>

      <div>
        <Label className="text-sm font-semibold text-gray-700 mb-2 block">Preview Text</Label>
        <Input
          value={form.previewText}
          onChange={(e) => setForm({ ...form, previewText: e.target.value })}
          className="rounded-xl h-11"
          placeholder="Short snippet shown in email preview (optional)"
        />
        <p className="text-xs text-gray-400 mt-1">
          This text appears next to the subject line to entice opens
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-700">
          💡 <strong>Tip:</strong> A good subject line increases open rates. Keep it under 50
          characters for mobile-friendly display.
        </p>
      </div>
    </div>
  );
}
