"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HiSparkles, HiPhotograph, HiDownload, HiPencil} from "react-icons/hi";
import { FaMask } from "react-icons/fa";
import { useToast } from "@/hooks/use-toast";
import { UpgradeModal } from "@/components/billing/UpgradeModal";

const STYLES = ["photorealistic", "digital art", "illustration", "watercolor", "3D render", "minimalist", "abstract", "vintage"];
const TEMPLATES = [
  { id: "event-announcement", label: "Event Announcement" },
  { id: "marketing-campaign", label: "Marketing Campaign" },
  { id: "notice", label: "Notice" },
];
const QUALITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];
const SIZES = [
  { value: "1024x1024", label: "Square (1024x1024)" },
  { value: "1024x1536", label: "Portrait (1024x1536)" },
  { value: "1536x1024", label: "Landscape (1536x1024)" },
];

export default function AIStudioPage() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("photorealistic");
  const [quality, setQuality] = useState("medium");
  const [size, setSize] = useState("1024x1024");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Array<{ url: string; style: string; id: string }>>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [history, setHistory] = useState<Array<{ url: string; prompt: string; isMock: boolean }>>([]);
  const [template, setTemplate] = useState("event-announcement");
  const [tabValue, setTabValue] = useState("generate");

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<"aiImage" | "aiText">("aiImage");
  const [usageData, setUsageData] = useState<any>(null);

  // Image editing state
  const [editPrompt, setEditPrompt] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editMaskFile, setEditMaskFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const maskInputRef = useRef<HTMLInputElement>(null);

  // Load plans for upgrade modal
  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d))
      .catch((err) => console.error("Failed to load plans:", err));
  }, []);

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, template, quality, size }),
      });
      
      if (res.status === 403) {
        const data = await res.json();
        if (data.upgradeRequired) {
          setUpgradeFeature("aiImage");
          setUsageData(data);
          setShowUpgradeModal(true);
          toast({
            title: "Limit Reached",
            description: data.error,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      const data = await res.json();
      if (data.images) {
        setGeneratedImages(data.images);
        setImageUrl(data.primaryUrl);
        setSelectedImageId(data.primaryId);
        setIsMock(data.mock || false);
        setHistory((h) => [{ url: data.primaryUrl, prompt, isMock: data.mock || false }, ...h.slice(0, 7)]);
      } else if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Generation error:", err);
      toast({
        title: "Error",
        description: "Failed to generate image",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function editImage() {
    if (!editPrompt.trim() || !editImageFile || !imageUrl) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setEditLoading(true);
    try {
      const formData = new FormData();
      formData.append("prompt", editPrompt);
      formData.append("image", editImageFile);
      formData.append("size", size);
      if (editMaskFile) {
        formData.append("mask", editMaskFile);
      }

      const res = await fetch("/api/ai/image/edit", {
        method: "POST",
        body: formData,
      });

      if (res.status === 403) {
        const data = await res.json();
        if (data.upgradeRequired) {
          setUpgradeFeature("aiImage");
          setUsageData(data);
          setShowUpgradeModal(true);
          toast({
            title: "Limit Reached",
            description: data.error,
            variant: "destructive",
          });
          setEditLoading(false);
          return;
        }
      }

      const data = await res.json();
      if (data.url) {
        setImageUrl(data.url);
        setHistory((h) => [
          { url: data.url, prompt: editPrompt, isMock: false },
          ...h.slice(0, 7),
        ]);
        setEditPrompt("");
        setEditImageFile(null);
        setEditMaskFile(null);
        toast({
          title: "Success",
          description: "Image edited successfully",
        });
      } else if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Edit error:", err);
      toast({
        title: "Error",
        description: "Failed to edit image",
        variant: "destructive",
      });
    } finally {
      setEditLoading(false);
    }
  }

  const handleImageSelect = (file: File | null) => {
    setEditImageFile(file);
  };

  const handleMaskSelect = (file: File | null) => {
    setEditMaskFile(file);
  };

  const handleSelectGeneratedImage = (image: typeof generatedImages[0]) => {
    setImageUrl(image.url);
    setSelectedImageId(image.id);
  };

  const handleQuickEdit = (imageUrl: string) => {
    setTabValue("edit");
    // Create a temporary file from the data URL to use as the edit image
    fetch(imageUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], "generated-image.png", { type: "image/png" });
        setEditImageFile(file);
      });
  };

  return (
    <div className="max-w-6xl space-y-6">
      <Tabs value={tabValue} onValueChange={setTabValue} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl bg-gray-100 p-1">
          <TabsTrigger value="generate" className="rounded-lg data-[state=active]:bg-white">
            <HiSparkles className="mr-2" /> Generate
          </TabsTrigger>
          <TabsTrigger value="edit" className="rounded-lg data-[state=active]:bg-white">
            <HiPencil className="mr-2" /> Edit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Panel */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2">
                <HiSparkles className="text-violet-500 text-xl" />
                <h2 className="font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>AI Image Generator</h2>
                
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Image Description</Label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full min-h-28 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-violet-400 resize-none"
                  placeholder="A professional business team celebrating success in a modern office, golden hour lighting, high quality..."
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Template</Label>
                <Select value={template} onValueChange={setTemplate}>
                  <SelectTrigger className="rounded-xl border-gray-200 h-11 text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">Visual Style</Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger className="rounded-xl border-gray-200 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">Quality</Label>
                  <Select value={quality} onValueChange={setQuality}>
                    <SelectTrigger className="rounded-xl border-gray-200 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUALITIES.map((q) => (
                        <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Image Size</Label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger className="rounded-xl border-gray-200 h-11 text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={generate}
                disabled={loading || !prompt.trim()}
                className="w-full brand-gradient-bg text-white border-0 hover:opacity-90 h-11 rounded-xl font-semibold"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Generating image...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <HiPhotograph className="text-lg" />
                    Generate Image
                  </span>
                )}
              </Button>

              {isMock && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-xl p-3">
                  ⚡ Using mock content. Add proper API keys to your environment to enable AI generation.
                </p>
              )}
            </div>

            {/* Preview Panel */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {imageUrl ? (
                <div className="relative">
                  <img src={imageUrl} alt={prompt} className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center gap-2 p-4">
                    <a
                      href={imageUrl}
                      download="amplifyhub-ai-image.jpg"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-gray-50"
                    >
                      <HiDownload /> Download
                    </a>
                    <button
                      onClick={() => handleQuickEdit(imageUrl)}
                      className="bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-violet-600"
                    >
                      <HiPencil /> Edit
                    </button>
                  </div>
                </div>
              ) : (
                <div className="aspect-square flex flex-col items-center justify-center text-gray-300">
                  <HiPhotograph className="text-8xl mb-4" />
                  <p className="text-sm text-gray-400">Your AI image will appear here</p>
                  <p className="text-xs text-gray-300 mt-1">Enter a description and click Generate</p>
                </div>
              )}
              {imageUrl && (
                <div className="p-4 border-t border-gray-50">
                  <p className="text-xs text-gray-500 line-clamp-2">{prompt}</p>
                </div>
              )}
            </div>
          </div>

          {/* Generated Images Gallery */}
          {generatedImages.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>Generated Variations</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {generatedImages.map((image, i) => (
                  <div
                    key={i}
                    className={`relative group rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                      selectedImageId === image.id ? "border-violet-500" : "border-gray-200 hover:border-violet-300"
                    }`}
                    onClick={() => handleSelectGeneratedImage(image)}
                  >
                    <img src={image.url} alt={image.style} className="w-full aspect-square object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickEdit(image.url);
                        }}
                        className="bg-white text-gray-900 px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-gray-100"
                      >
                        <HiPencil className="text-sm" /> Edit
                      </button>
                      <p className="text-white text-xs text-center px-2 line-clamp-1">{image.style}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="edit" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Edit Panel */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2">
                <HiPencil className="text-violet-500 text-xl" />
                <h2 className="font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>Refine Image with Text</h2>
                
              </div>

              {editImageFile && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm font-semibold text-blue-900">✓ Image loaded</p>
                  <p className="text-xs text-blue-700 mt-1">{editImageFile.name}</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Image to Edit</Label>
                <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-violet-400 transition-colors cursor-pointer">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {editImageFile ? (
                    <div className="text-sm text-gray-700">
                      <p className="font-semibold">{editImageFile.name}</p>
                      <p className="text-xs text-gray-500">{(editImageFile.size / 1024).toFixed(2)} KB</p>
                    </div>
                  ) : (
                    <div className="text-gray-400">
                      <HiPhotograph className="text-4xl mx-auto mb-2" />
                      <p className="text-sm">Click to upload or drag image</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Text Refinement Prompt</Label>
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  className="w-full min-h-24 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-violet-400 resize-none"
                  placeholder="Describe what you want to change... Examples:&#10;• Make it black and white&#10;• Add more vibrant colors&#10;• Change the background to sunset&#10;• Increase brightness"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Mask (Optional)</Label>
                <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-violet-400 transition-colors cursor-pointer">
                  <input
                    ref={maskInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleMaskSelect(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {editMaskFile ? (
                    <div className="text-sm text-gray-700">
                      <p className="font-semibold">{editMaskFile.name}</p>
                      <p className="text-xs text-gray-500">{(editMaskFile.size / 1024).toFixed(2)} KB</p>
                    </div>
                  ) : (
                    <div className="text-gray-400">
                      <FaMask className="text-4xl mx-auto mb-2" />
                      <p className="text-sm">Optional: Click to upload mask</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Size</Label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger className="rounded-xl border-gray-200 h-11 text-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={editImage}
                disabled={editLoading || !editPrompt.trim() || !editImageFile}
                className="w-full brand-gradient-bg text-white border-0 hover:opacity-90 h-11 rounded-xl font-semibold"
              >
                {editLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Refining image...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <HiPencil className="text-lg" />
                    Refine Image
                  </span>
                )}
              </Button>
            </div>

            {/* Preview Panel */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {imageUrl ? (
                <div className="relative">
                  <img src={imageUrl} alt="Result" className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                    <a
                      href={imageUrl}
                      download="amplifyhub-ai-image.jpg"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-gray-50"
                    >
                      <HiDownload /> Download
                    </a>
                  </div>
                </div>
              ) : (
                <div className="aspect-square flex flex-col items-center justify-center text-gray-300">
                  <HiPhotograph className="text-8xl mb-4" />
                  <p className="text-sm text-gray-400">Refined image will appear here</p>
                  <p className="text-xs text-gray-300 mt-1">Upload an image and describe your refinements</p>
                </div>
              )}
              {imageUrl && (
                <div className="p-4 border-t border-gray-50">
                  <p className="text-xs text-gray-500 line-clamp-2">{editPrompt}</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>Recent Generations</h3>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => setImageUrl(h.url)}
                className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-violet-400 transition-all"
              >
                <img src={h.url} alt={h.prompt} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={upgradeFeature}
        currentUsage={usageData?.current || 0}
        limit={usageData?.limit || 5}
        plans={plans}
        onSelectPlan={() => window.location.href = '/dashboard/billing'}
      />
    </div>
  );
}
