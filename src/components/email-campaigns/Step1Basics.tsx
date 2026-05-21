"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type WizardFormData = {
  name: string;
  subject: string;
  previewText: string;
  htmlContent: string;
  campaignId?: string;
  templateId?: string;
};

interface Step1BasicsProps {
  form: WizardFormData;
  setForm: (form: WizardFormData) => void;
  socialCampaigns?: any[];
}

export default function Step1Basics({ form, setForm, socialCampaigns = [] }: Step1BasicsProps) {
  return (
    <div className="space-y-6 py-4">
      <div>
        <Label className="text-sm font-semibold text-gray-700 mb-2 block">Campaign Name *</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-xl h-11 text-black"
          placeholder="e.g., Monthly Newsletter, Spring Sale"
        />
        <p className="text-xs text-gray-400 mt-1">Internal name for your reference</p>
      </div>

      <div>
        <Label className="text-sm font-semibold text-gray-700 mb-2 block">Subject Line *</Label>
        <Input
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="rounded-xl h-11 text-black"
          placeholder="e.g., Check Out Our Latest Products!"
        />
        <p className="text-xs text-gray-400 mt-1">This is what recipients see in their inbox</p>
      </div>

      <div>
        <Label className="text-sm font-semibold text-gray-700 mb-2 block">Preview Text</Label>
        <Input
          value={form.previewText}
          onChange={(e) => setForm({ ...form, previewText: e.target.value })}
          className="rounded-xl h-11 text-black"
          placeholder="Short snippet shown in email preview (optional)"
        />
        <p className="text-xs text-gray-400 mt-1">
          This text appears next to the subject line to entice opens
        </p>
      </div>

      {socialCampaigns && socialCampaigns.length > 0 && (
        <div>
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">Link to Social Campaign (Optional)</Label>
          <Select 
            value={form.campaignId || "none"} 
            onValueChange={(value) => setForm({ ...form, campaignId: value === "none" ? undefined : value })}
          >
            <SelectTrigger className="rounded-xl h-11 text-black">
              <SelectValue placeholder="Select a campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No campaign</SelectItem>
              {socialCampaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-400 mt-1">
            Link this email to a social media campaign for unified tracking
          </p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-700">
          💡 <strong>Tip:</strong> A good subject line increases open rates. Keep it under 50
          characters for mobile-friendly display.
        </p>
      </div>
    </div>
  );
}
