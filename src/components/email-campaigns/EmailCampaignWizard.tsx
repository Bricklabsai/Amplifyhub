"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HiPlus, HiChevronLeft, HiChevronRight } from "react-icons/hi";
import Step1Basics from "./Step1Basics";
import Step2Design from "./Step2Design";
import Step3Audience from "./Step3Audience";


type Group = { id: string; name: string; _count: { contacts: number } };

type WizardFormData = {
  name: string;
  subject: string;
  previewText: string;
  htmlContent: string;
};

interface EmailCampaignWizardProps {
  groups: Group[];
  onCampaignCreated: () => void;
}

export default function EmailCampaignWizard({ groups, onCampaignCreated }: EmailCampaignWizardProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [form, setForm] = useState<WizardFormData>({
    name: "",
    subject: "",
    previewText: "",
    htmlContent: "",
  });
  const [loading, setLoading] = useState(false);

  const totalRecipients = selectedGroupIds.reduce((total, id) => {
    const g = groups.find((x) => x.id === id);
    return total + (g?._count?.contacts || 0);
  }, 0);

  async function handleCreate() {
    setLoading(true);
    try {
      const res = await fetch("/api/email-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      // If groups are selected, attach them to the new campaign
      if (selectedGroupIds.length > 0) {
        await fetch(`/api/email-campaigns/${data.id}/attach-groups`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupIds: selectedGroupIds }),
        });
      }

      onCampaignCreated();
      resetWizard();
    } catch (error) {
      console.error("Failed to create campaign:", error);
    } finally {
      setLoading(false);
    }
  }

  function resetWizard() {
    setStep(1);
    setOpen(false);
    setForm({ name: "", subject: "", previewText: "", htmlContent: "" });
    setSelectedGroupIds([]);
  }

  function handleNext() {
    if (step < 3) {
      setStep(step + 1);
    }
  }

  function handlePrev() {
    if (step > 1) {
      setStep(step - 1);
    }
  }

  function isStepValid(): boolean {
    if (step === 1) {
      return form.name.trim() !== "" && form.subject.trim() !== "";
    }
    if (step === 2) {
      return form.htmlContent.trim() !== "";
    }
    if (step === 3) {
      return selectedGroupIds.length > 0;
    }
    return false;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="brand-gradient-bg text-white border-0 hover:opacity-90 rounded-xl font-semibold text-sm flex items-center gap-2">
          <HiPlus /> New Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl rounded-2xl">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "Outfit, sans-serif" }}>
            Create Email Campaign
            <span className="text-xs font-normal text-gray-500 ml-2">Step {step} of 3</span>
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex gap-2 my-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-all ${
                s <= step ? "bg-violet-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-96">
          {step === 1 && <Step1Basics form={form} setForm={setForm} />}
          {step === 2 && <Step2Design form={form} setForm={setForm} />}
          {step === 3 && (
            <Step3Audience
              groups={groups}
              selectedGroupIds={selectedGroupIds}
              setSelectedGroupIds={setSelectedGroupIds}
              totalRecipients={totalRecipients}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={step === 1}
            className="rounded-xl h-11 flex items-center gap-2"
          >
            <HiChevronLeft /> Back
          </Button>

          <div className="text-xs text-gray-500">
            {step === 3 && totalRecipients > 0 && (
              <span>{totalRecipients} recipient{totalRecipients !== 1 ? "s" : ""} selected</span>
            )}
          </div>

          {step < 3 ? (
            <Button
              onClick={handleNext}
              disabled={!isStepValid()}
              className="brand-gradient-bg text-white border-0 hover:opacity-90 rounded-xl h-11 flex items-center gap-2 font-semibold"
            >
              Next <HiChevronRight />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={!isStepValid() || loading}
              className="brand-gradient-bg text-white border-0 hover:opacity-90 rounded-xl h-11 font-semibold"
            >
              {loading ? "Creating..." : "Create Campaign"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
