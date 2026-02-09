"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Upload,
  Loader2,
  Download,
  X,
  ImageIcon,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Image,
  PenLine,
  Globe,
  Droplet,
  Battery,
  Shield,
  Zap,
  Wifi,
  Star,
  Heart,
  Lock,
  Flame,
  Gift,
  Clock,
  Bluetooth,
  Leaf,
  Sun,
  Snowflake,
  Book,
  Camera,
  Truck,
  BarChart2,
  Bell,
  Tag,
  Bookmark,
  Trophy,
  FileText,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from "lucide-react";

function safeRender(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

const FEATURE_ICONS: Record<string, LucideIcon> = {
  droplet: Droplet,
  battery: Battery,
  shield: Shield,
  zap: Zap,
  wifi: Wifi,
  star: Star,
  heart: Heart,
  lock: Lock,
  flame: Flame,
  gift: Gift,
  clock: Clock,
  sparkles: Sparkles,
  check: Check,
  bluetooth: Bluetooth,
  leaf: Leaf,
  sun: Sun,
  snowflake: Snowflake,
  book: Book,
  camera: Camera,
  truck: Truck,
  globe: Globe,
  chart: BarChart2,
  bell: Bell,
  tag: Tag,
  bookmark: Bookmark,
  trophy: Trophy,
};

function FeatureIcon({ name }: { name?: string }) {
  const Icon = name ? FEATURE_ICONS[name.toLowerCase()] : Check;
  return Icon ? <Icon className="h-4 w-4 shrink-0 text-violet-400" /> : <Check className="h-4 w-4 shrink-0 text-violet-400" />;
}

function imageUrl(url: string | undefined | null): string {
  if (url == null || typeof url !== "string") return "";
  if (url.startsWith("data:")) return url;
  if (url.startsWith("https://replicate.delivery") || url.startsWith("https://api.replicate.com/"))
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  return url;
}

type PipelineStage =
  | "idle"
  | "copy"
  | "creative"
  | "generating"
  | "done"
  | "error";

interface AdResult {
  inputImage: string;
  copyOutput?: {
    headline: string;
    subheadline: string;
    cta: string;
    price?: string;
    section3Headline?: string;
    section3Subheadline?: string;
    features?: Array<{ visual?: string; icon?: string; text: string; description?: string } | string>;
  };
  creativeOutput?: {
    accentColor: string;
    headline: {
      font_family: string;
      font_size: string;
      position: string;
      has_bold: boolean;
      bold_where?: string;
      has_accent: boolean;
      accent_where?: string;
    };
    subheadline: {
      visible: boolean;
      font_family: string;
      font_size: string;
      position: string;
      has_bold: boolean;
      bold_where?: string;
      has_accent: boolean;
      accent_where?: string;
    };
    product: {
      reversed?: boolean;
      position: string;
      zoom: string;
      rotation?: string;
      focus?: string;
      treatment?: string;
    };
    background: string;
    cta: {
      has_background: boolean;
      is_chip: boolean;
      position: string;
      style: string;
    };
    price: {
      has_background: boolean;
      is_chip: boolean;
      position: string;
      style: string;
    };
    effects: string;
  };
  generatedImageUrl?: string;
  refinedImageUrl?: string;
  image1Url?: string;
  image2Url?: string;
  image3Url?: string;
  imageUrl?: string;
}

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 Square" },
  { value: "4:5", label: "4:5 (Instagram)" },
  { value: "9:16", label: "9:16 (Stories)" },
  { value: "16:9", label: "16:9 (Landscape)" },
  { value: "landing", label: "Landing page" },
] as const;

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "ar", label: "Arabic" },
] as const;

const ARABIC_DIALECTS = [
  { value: "algerian", label: "Algerian (Darija)" },
  { value: "tunisian", label: "Tunisian (Darija)" },
  { value: "moroccan", label: "Moroccan (Darija)" },
] as const;

const FORM_STEPS = [
  { id: 1, title: "Upload", subtitle: "Product image", icon: Image },
  { id: 2, title: "Details", subtitle: "Features & price", icon: PenLine },
  { id: 3, title: "Format", subtitle: "Size & language", icon: Globe },
  { id: 4, title: "Generate", subtitle: "Create your ad", icon: Sparkles },
] as const;

const STAGES: { key: PipelineStage; label: string }[] = [
  { key: "copy", label: "Copy" },
  { key: "creative", label: "Creative" },
  { key: "generating", label: "Image" },
];

function PipelineStepper({
  currentStage,
  stages = STAGES,
}: {
  currentStage: PipelineStage;
  stages?: { key: PipelineStage; label: string }[];
}) {
  const currentIndex = stages.findIndex((s) => s.key === currentStage);
  const progressPercent =
    currentIndex >= 0 ? ((currentIndex + 0.5) / stages.length) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        {stages.map((s, i) => {
          const isActive = s.key === currentStage;
          const isComplete = currentIndex > i;
          return (
            <div key={s.key} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300",
                  isActive && "bg-violet-500 text-white",
                  isComplete && "bg-violet-500 text-white",
                  !isActive && !isComplete && "bg-white/10 text-white/50"
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  isActive ? "text-white" : "text-white/60"
                )}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
      <Progress value={progressPercent} className="h-1.5 bg-white/10 [&>div]:bg-violet-500" />
    </div>
  );
}

function PipelineSkeleton({
  currentStage,
  inputImage,
}: {
  currentStage: PipelineStage;
  inputImage?: string | null;
}) {
  const stageIndex = STAGES.findIndex((s) => s.key === currentStage);
  const showImage = stageIndex >= 2 && inputImage;

  return (
    <div className="relative aspect-square w-full rounded-2xl bg-white/[0.06] overflow-hidden">
      {showImage && (
        <img
          src={inputImage ?? ""}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-20 blur-[2px]"
        />
      )}
      <div className="absolute inset-0 flex flex-col gap-2 p-4">
        <div
          className={cn(
            "rounded-lg p-3 transition-all",
            stageIndex === 0 ? "bg-violet-500/20" : ""
          )}
        >
          <Skeleton className="mb-2 h-5 w-3/4 bg-white/10" />
          <Skeleton className="h-3 w-full bg-white/10" />
          <Skeleton className="h-3 w-1/2 bg-white/10" />
        </div>
        <div
          className={cn(
            "flex flex-1 items-center justify-center rounded-lg transition-all",
            stageIndex === 2 ? "bg-violet-500/20" : ""
          )}
        >
          <Skeleton className="aspect-square w-24 rounded-lg bg-white/10" />
        </div>
        <div
          className={cn(
            "rounded-lg p-2 transition-all",
            stageIndex === 1 ? "bg-violet-500/20" : ""
          )}
        >
          <Skeleton className="h-8 w-24 rounded-md bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function LandingPreviewSkeleton({ inputImage }: { inputImage?: string | null }) {
  return (
    <div className="relative max-w-[420px] aspect-[2/5] max-h-[80vh] w-full rounded-2xl overflow-hidden shadow-2xl shadow-black/40 flex flex-col bg-white/[0.04]">
      {inputImage ? (
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={inputImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-10 blur-sm"
          />
        </div>
      ) : null}
      <div className="relative flex-1 flex flex-col p-4 gap-4 min-h-0">
        <div className="flex-1 min-h-0 rounded-xl overflow-hidden">
          <Skeleton className="h-full w-full rounded-xl bg-white/10" />
        </div>
        <div className="flex-1 min-h-0 rounded-xl overflow-hidden">
          <Skeleton className="h-full w-full rounded-xl bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function LandingPreview({ imageUrl, image2Url, imageUrlFn }: { imageUrl?: string; image2Url?: string; imageUrlFn: (url: string) => string }) {
  if (!imageUrl && !image2Url) return null;
  return (
    <div className="flex flex-col gap-4 items-center max-w-full max-h-[75vh] overflow-hidden">
      {imageUrl && (
        <img
          src={imageUrlFn(imageUrl)}
          alt="Section 1"
          className="max-w-full max-h-[36vh] w-auto h-auto rounded-2xl object-contain shadow-2xl shadow-black/30"
        />
      )}
      {image2Url && (
        <img
          src={imageUrlFn(image2Url)}
          alt="Sections 2+3"
          className="max-w-full max-h-[36vh] w-auto h-auto rounded-2xl object-contain shadow-2xl shadow-black/30"
        />
      )}
    </div>
  );
}

function LandingMergeAndDownload({ imageUrl, image2Url, onMerged }: { imageUrl?: string; image2Url?: string; onMerged?: (mergedUrl: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);

  const handleMerge = async () => {
    if (!imageUrl || !image2Url) return;
    setLoading(true);
    try {
      // Use original URLs (not proxied) for merging
      const response = await fetch("/api/landing-ad/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image1Url: imageUrl, image2Url }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Merge failed" }));
        throw new Error(error.error || "Merge failed");
      }
      const blob = await response.blob();
      const objUrl = URL.createObjectURL(blob);
      setMergedUrl(objUrl);
      onMerged?.(objUrl);
      // Auto-download
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = "landing-full.png";
      a.click();
    } catch (e) {
      console.error("Merge error:", e);
      alert(e instanceof Error ? e.message : "Failed to merge images");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadMerged = () => {
    if (!mergedUrl) return;
    const a = document.createElement("a");
    a.href = mergedUrl;
    a.download = "landing-full.png";
    a.click();
  };

  if (!imageUrl || !image2Url) return null;

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <button
        type="button"
        onClick={handleMerge}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-violet-500/20 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-violet-500/30 disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
            Merging...
          </>
        ) : (
          <>
            <Image className="h-4 w-4" />
            Merge & Download
          </>
        )}
      </button>
      {mergedUrl && (
        <button
          type="button"
          onClick={handleDownloadMerged}
          className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] px-4 py-3 text-sm font-medium text-white transition-all hover:bg-white/[0.1]"
        >
          <Download className="h-4 w-4" />
          Download Merged
        </button>
      )}
    </div>
  );
}

function processFile(file: File, setImage: (v: string) => void, setError: (v: string | null) => void, setResult: (v: AdResult | null) => void) {
  if (!file.type.startsWith("image/")) {
    setError("Please select an image file (JPEG, PNG, WebP)");
    return;
  }
  setError(null);
  setResult(null);
  const reader = new FileReader();
  reader.onload = () => setImage(reader.result as string);
  reader.readAsDataURL(file);
}

export default function Home() {
  const [formStep, setFormStep] = useState(1);
  const [image, setImage] = useState<string | null>(null);
  const [price, setPrice] = useState<string>("");
  const [productFeatures, setProductFeatures] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [copyLanguage, setCopyLanguage] = useState<string>("en");
  const [arabicDialect, setArabicDialect] = useState<string>("algerian");
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [result, setResult] = useState<AdResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mergedImageUrl, setMergedImageUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [promptLog, setPromptLog] = useState<Array<{ step: string; label: string; prompt: string; output?: string }>>([]);
  const [promptExpanded, setPromptExpanded] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const promptLogRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file, setImage, setError, setResult);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      processFile(file, setImage, setError, setResult);
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const clearImage = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setStage("idle");
    setFormStep(1);
    setMergedImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const goToStep = (step: number) => setFormStep(step);

  const canProceed = () => {
    if (formStep === 1) return !!image;
    return true;
  };

  const handleGenerate = async () => {
    if (!image) return;
    setStage("copy");
    setError(null);
    setResult(null);
    setMergedImageUrl(null);
    setPromptLog([]);
    setPromptExpanded(null);

    const isLanding = aspectRatio === "landing";
    const apiUrl = isLanding ? "/api/landing-ad/stream" : "/api/ad/stream";

    try {
      const formData = new FormData();
      const blob = await (await fetch(image)).blob();
      formData.append("image", blob, "product.jpg");
      if (price.trim()) formData.append("price", price.trim());
      if (productFeatures.trim()) formData.append("productFeatures", productFeatures.trim());
      if (!isLanding) formData.append("aspectRatio", aspectRatio);
      formData.append("copyLanguage", copyLanguage);
      if (copyLanguage === "ar") formData.append("arabicDialect", arabicDialect);

      const response = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok || !response.body) {
        throw new Error("Request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const idx = event.indexOf("data: ");
          if (idx === -1) continue;
          try {
            const data = JSON.parse(event.slice(idx + 6).trim());
            if (data.stage && data.stage !== "done") {
              const s = data.stage;
              if (["copy", "features"].includes(s)) setStage("copy");
              else if (["creative", "creative1", "creative2", "creative3"].includes(s)) setStage("creative");
              else if (["image"].includes(s)) setStage("generating");
              else setStage(s);
              if (data.prompt && data.promptLabel && isLanding) {
                setPromptLog((prev) => [...prev, { step: s, label: data.promptLabel, prompt: data.prompt, output: data.output }]);
                setTimeout(() => promptLogRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
              }
              if (data.output && !data.prompt && isLanding) {
                setPromptLog((prev) => {
                  const next = [...prev];
                  const idx = next.findLastIndex((e) => e.step === s);
                  if (idx >= 0) next[idx] = { ...next[idx], output: data.output };
                  return next;
                });
                setTimeout(() => promptLogRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
              }
              resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            if (data.stage === "done" && data.result) {
              setStage("done");
              setResult(data.result);
              resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            if (data.error) throw new Error(data.error);
          } catch (e) {
            if (e instanceof Error && e.message !== "Request failed") throw e;
          }
        }
      }

      for (const event of buffer.split("\n\n").filter(Boolean)) {
        const idx = event.indexOf("data: ");
        if (idx === -1) continue;
        try {
          const data = JSON.parse(event.slice(idx + 6).trim());
          if (data.stage && data.stage !== "done") {
            const s = data.stage;
            if (["copy", "features"].includes(s)) setStage("copy");
            else if (["creative", "creative1", "creative2", "creative3"].includes(s)) setStage("creative");
            else if (["image"].includes(s)) setStage("generating");
            else setStage(s);
            if (data.prompt && data.promptLabel && isLanding) {
              setPromptLog((prev) => [...prev, { step: s, label: data.promptLabel, prompt: data.prompt, output: data.output }]);
            }
            if (data.output && !data.prompt && isLanding) {
              setPromptLog((prev) => {
                const next = [...prev];
                const idx = next.findLastIndex((e) => e.step === s);
                if (idx >= 0) next[idx] = { ...next[idx], output: data.output };
                return next;
              });
            }
            resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          if (data.stage === "done" && data.result) {
            setStage("done");
            setResult(data.result);
            resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          if (data.error) throw new Error(data.error);
        } catch (e) {
          if (e instanceof Error && e.message !== "Request failed") throw e;
        }
      }
    } catch (err: any) {
      setStage("error");
      setError(err.message || "Something went wrong");
    }
  };

  const canRetryFromImage2 =
    aspectRatio === "landing" &&
    stage === "error" &&
    image &&
    result?.copyOutput;

  const handleRetry = async () => {
    if (!canRetryFromImage2 || !image || !result?.copyOutput) return;
    setStage("generating");
    setError(null);
    setPromptLog([]);

    try {
      const formData = new FormData();
      const blob = await (await fetch(image)).blob();
      formData.append("image", blob, "product.jpg");
      formData.append("copyOutput", JSON.stringify(result.copyOutput));
      if (price.trim()) formData.append("price", price.trim());
      formData.append("copyLanguage", copyLanguage);
      if (copyLanguage === "ar") formData.append("arabicDialect", arabicDialect);

      const response = await fetch("/api/landing-ad/retry", {
        method: "POST",
        body: formData,
      });

      if (!response.ok || !response.body) throw new Error("Request failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const idx = event.indexOf("data: ");
          if (idx === -1) continue;
          try {
            const data = JSON.parse(event.slice(idx + 6).trim());
            if (data.stage && data.stage !== "done") {
              if (["image"].includes(data.stage)) setStage("generating");
              else setStage(data.stage);
              if (data.prompt && data.promptLabel) {
                setPromptLog((prev) => [...prev, { step: data.stage, label: data.promptLabel, prompt: data.prompt, output: data.output }]);
                setTimeout(() => promptLogRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
              }
              if (data.output && !data.prompt) {
                setPromptLog((prev) => {
                  const next = [...prev];
                  const idx = next.findLastIndex((e) => e.step === data.stage);
                  if (idx >= 0) next[idx] = { ...next[idx], output: data.output };
                  return next;
                });
                setTimeout(() => promptLogRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
              }
            }
            if (data.stage === "done" && data.result) {
              setStage("done");
              setResult(data.result);
              setError(null);
              resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            if (data.error) throw new Error(data.error);
          } catch (e) {
            if (e instanceof Error && e.message !== "Request failed") throw e;
          }
        }
      }

      for (const event of buffer.split("\n\n").filter(Boolean)) {
        const idx = event.indexOf("data: ");
        if (idx === -1) continue;
        try {
          const data = JSON.parse(event.slice(idx + 6).trim());
          if (data.stage && data.stage !== "done" && data.prompt && data.promptLabel) {
            setPromptLog((prev) => [...prev, { step: data.stage, label: data.promptLabel, prompt: data.prompt, output: data.output }]);
          }
          if (data.stage && data.stage !== "done" && data.output && !data.prompt) {
            setPromptLog((prev) => {
              const next = [...prev];
              const idx = next.findLastIndex((e) => e.step === data.stage);
              if (idx >= 0) next[idx] = { ...next[idx], output: data.output };
              return next;
            });
          }
          if (data.stage === "done" && data.result) {
            setStage("done");
            setResult(data.result);
            setError(null);
            resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          if (data.error) throw new Error(data.error);
        } catch (e) {
          if (e instanceof Error && e.message !== "Request failed") throw e;
        }
      }
    } catch (err: any) {
      setStage("error");
      setError(err.message || "Retry failed");
    }
  };

  const isProcessing =
    stage !== "idle" && stage !== "done" && stage !== "error";

  // Auto-expand latest prompt when it streams in
  useEffect(() => {
    if (promptLog.length > 0) {
      const last = promptLog[promptLog.length - 1];
      setPromptExpanded(`${last.step}-${promptLog.length - 1}`);
    }
  }, [promptLog.length]);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-30%,rgba(139,92,246,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_20%,rgba(99,102,241,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_20%_80%,rgba(139,92,246,0.06),transparent_50%)]" />
        <div className="absolute top-1/3 left-1/4 w-[480px] h-[480px] bg-violet-500/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[420px] h-[420px] bg-indigo-500/7 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,transparent_60%,rgba(10,10,11,0.4)_100%)]" />
      </div>

      <div className="relative flex h-screen overflow-hidden">
        {/* Left sidebar: Stepper + form */}
        <aside className="w-[320px] md:w-[380px] shrink-0 flex flex-col border-r border-white/[0.06] bg-black/20 backdrop-blur-xl overflow-hidden">
          <div className="p-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-400" />
              <span className="font-semibold text-white">Product Ad Studio</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Vertical stepper */}
            <div className="space-y-1">
              {FORM_STEPS.map((s, i) => {
                const isActive = formStep === s.id;
                const isComplete = formStep > s.id;
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => formStep >= s.id && goToStep(s.id)}
                    className={cn(
                      "w-full flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-300 text-left",
                      isActive && "bg-violet-500/20",
                      isComplete && "opacity-100",
                      !isActive && !isComplete && "opacity-60 hover:opacity-80 hover:bg-white/[0.04]"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                        isActive && "bg-violet-500 text-white",
                        isComplete && "bg-violet-500/80 text-white",
                        !isActive && !isComplete && "bg-white/10 text-white/60"
                      )}
                    >
                      {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={cn("text-sm font-medium block", isActive ? "text-white" : "text-white/60")}>
                        {s.title}
                      </span>
                      <span className="text-xs text-white/40 block">{s.subtitle}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Form content */}
            <Card className="bg-white/[0.06] backdrop-blur-xl shadow-2xl shadow-black/30 shrink-0">
              <CardContent className="p-0">
                {/* Step 1: Upload */}
                {formStep === 1 && (
                  <div className="animate-step-in p-6 sm:p-8">
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-white">Upload product image</h2>
                      <p className="mt-1 text-sm text-white/50">Drop your product photo to get started</p>
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Upload product image"
                      onClick={() => !image && fileInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (!image && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      className={cn(
                        "group relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl transition-all duration-300 outline-none",
                        !image && "bg-white/[0.04] hover:bg-violet-500/[0.06]",
                        isDragging && "bg-violet-500/10 scale-[1.02]"
                      )}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      {image ? (
                        <>
                          <img
                            src={image}
                            alt="Product"
                            className="h-full w-full object-cover rounded-xl transition-opacity group-hover:opacity-90"
                          />
                          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 rounded-2xl">
                            <Button
                              type="button"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                              className="bg-white text-black hover:bg-white/90"
                            >
                              <Upload className="h-4 w-4" />
                              Change
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearImage();
                              }}
                            >
                              <X className="h-4 w-4" />
                              Remove
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={cn(
                            "mb-4 rounded-2xl p-5 transition-all duration-300",
                            isDragging ? "bg-violet-500/20" : "bg-white/5"
                          )}>
                            <Upload className={cn("h-12 w-12", isDragging ? "text-violet-400" : "text-white/40")} />
                          </div>
                          <span className={cn(
                            "text-sm font-medium transition-colors",
                            isDragging ? "text-violet-400" : "text-white/60"
                          )}>
                            {isDragging ? "Drop your image here" : "Drop image or click to upload"}
                          </span>
                          <span className="mt-1 text-xs text-white/40">JPEG, PNG, or WebP</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 2: Product details */}
                {formStep === 2 && (
                  <div className="animate-step-in p-6 sm:p-8">
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-white">Product details</h2>
                      <p className="mt-1 text-sm text-white/50">Optional—helps AI write better copy</p>
                    </div>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="features" className="text-white/70 text-sm font-medium">
                          Product features
                        </Label>
                        <textarea
                          id="features"
                          value={productFeatures}
                          onChange={(e) => setProductFeatures(e.target.value)}
                          placeholder="e.g. Waterproof, 24hr battery, Wireless charging"
                          rows={3}
                          className="w-full rounded-xl bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:bg-white/[0.08] transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price" className="text-white/70 text-sm font-medium">
                          Price
                        </Label>
                        <Input
                          id="price"
                          type="text"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="e.g. $29.99 or From $19"
                          className="rounded-xl bg-white/[0.06] text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:bg-white/[0.08]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Format & language */}
                {formStep === 3 && (
                  <div className="animate-step-in p-6 sm:p-8">
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-white">Format & language</h2>
                      <p className="mt-1 text-sm text-white/50">Choose output size and copy language</p>
                    </div>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Label className="text-white/70 text-sm font-medium">Aspect ratio</Label>
                        <Select value={aspectRatio} onValueChange={setAspectRatio}>
                          <SelectTrigger className="rounded-xl bg-white/[0.06] text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-white/10 bg-zinc-900">
                            {ASPECT_RATIOS.map((r) => (
                              <SelectItem key={r.value} value={r.value} className="text-white">
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white/70 text-sm font-medium">Copy language</Label>
                        <Select
                          value={copyLanguage}
                          onValueChange={(v) => {
                            setCopyLanguage(v);
                            if (v !== "ar") setArabicDialect("algerian");
                          }}
                        >
                          <SelectTrigger className="rounded-xl bg-white/[0.06] text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-white/10 bg-zinc-900">
                            {LANGUAGES.map((l) => (
                              <SelectItem key={l.value} value={l.value} className="text-white">
                                {l.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {copyLanguage === "ar" && (
                        <div className="space-y-2">
                          <Label className="text-white/70 text-sm font-medium">Arabic dialect</Label>
                          <Select value={arabicDialect} onValueChange={setArabicDialect}>
                            <SelectTrigger className="rounded-xl bg-white/[0.06] text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-white/10 bg-zinc-900">
                              {ARABIC_DIALECTS.map((d) => (
                                <SelectItem key={d.value} value={d.value} className="text-white">
                                  {d.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 4: Review & generate */}
                {formStep === 4 && (
                  <div className="animate-step-in p-6 sm:p-8">
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-white">Ready to create</h2>
                      <p className="mt-1 text-sm text-white/50">Review your settings and generate</p>
                    </div>
                    <div className="space-y-4">
                        {image && (
                        <div className="rounded-xl overflow-hidden bg-white/5 aspect-square w-32 shrink-0">
                          <img src={image} alt="Product" className="w-full h-full rounded-xl object-cover" />
                        </div>
                      )}
                      <div className="rounded-xl bg-white/[0.06] p-4 space-y-2 text-sm">
                        <p><span className="text-white/50">Format:</span> <span className="text-white">{ASPECT_RATIOS.find(r => r.value === aspectRatio)?.label}</span></p>
                        <p><span className="text-white/50">Language:</span> <span className="text-white">{LANGUAGES.find(l => l.value === copyLanguage)?.label}</span></p>
                        {price && <p><span className="text-white/50">Price:</span> <span className="text-white">{price}</span></p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="mx-6 mb-4 flex items-center justify-between gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    <span className="flex flex-1 items-center gap-2 min-w-0">
                      <span className="shrink-0 rounded-full bg-red-500/20 p-1 text-xs">!</span>
                      <span className="truncate">{error}</span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {canRetryFromImage2 && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleRetry}
                          disabled={isProcessing}
                          className="bg-violet-500 text-white hover:bg-violet-600 text-xs"
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>Retry sections 2 & 3</>
                          )}
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() => setError(null)}
                        className="rounded p-1 text-red-400 hover:bg-red-500/20"
                        aria-label="Dismiss error"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Navigation buttons */}
                <div className="flex items-center justify-between gap-4 p-6 pt-0 mt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => goToStep(formStep - 1)}
                    disabled={formStep === 1}
                    className="text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                  {formStep < 4 ? (
                    <Button
                      type="button"
                      onClick={() => goToStep(formStep + 1)}
                      disabled={!canProceed()}
                      className="bg-violet-500 text-white hover:bg-violet-600 px-6"
                    >
                      Continue
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleGenerate}
                      disabled={!image || isProcessing}
                      className="bg-violet-500 text-white hover:bg-violet-600 px-6"
                    >
                      {stage === "idle" || stage === "error" ? (
                        <>
                          <Sparkles className="h-5 w-5" />
                          Generate Ad
                        </>
                      ) : stage === "done" ? (
                        <>
                          <Sparkles className="h-5 w-5" />
                          Generate Another
                        </>
                      ) : (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* In-progress pipeline */}
                {isProcessing && (
                  <div className="space-y-3 rounded-2xl bg-violet-500/[0.06] p-4 mx-4 mb-4 mt-4">
                    <p className="text-sm font-medium text-white/70">Pipeline</p>
                    <PipelineStepper currentStage={stage} />
                    <p className="text-xs text-white/50">
                      {stage === "copy" && "Writing ad copy..."}
                      {stage === "creative" && "Designing layout and styling..."}
                      {stage === "generating" && "Generating images..."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* Center: Generated image */}
        <main ref={resultRef} className="flex-1 min-w-0 min-h-0 flex flex-col items-center justify-center p-6 overflow-hidden">
          <div className="w-full max-w-xl h-full flex flex-col items-center justify-center gap-3 overflow-hidden">
            <p className="text-center text-sm text-white/50 shrink-0">
              {result?.refinedImageUrl
                ? "Your ad is ready"
                : result?.imageUrl
                  ? "Your landing page is ready"
                  : isProcessing
                    ? "AI is creating your ad"
                    : "Complete the steps to generate your ad"}
            </p>
            <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden">
            <div className="rounded-2xl overflow-hidden bg-white/[0.04] max-h-full max-w-full">
            {mergedImageUrl ? (
              <div className="animate-fade-in flex items-center justify-center max-h-full overflow-hidden p-4">
                <img
                  src={mergedImageUrl}
                  alt="Merged landing page"
                  className="max-w-full max-h-[80vh] w-auto h-auto rounded-2xl object-contain shadow-2xl shadow-black/30"
                />
              </div>
            ) : result?.imageUrl || result?.image2Url ? (
              <div className="animate-fade-in flex items-center justify-center max-h-full overflow-hidden p-4">
                <LandingPreview imageUrl={result.imageUrl} image2Url={result.image2Url} imageUrlFn={imageUrl} />
              </div>
                ) : result?.refinedImageUrl ? (
                  <div className="animate-fade-in flex items-center justify-center">
                    <img
                      src={imageUrl(result.refinedImageUrl ?? "")}
                      alt="Generated ad"
                      className="max-w-full max-h-[80vh] w-auto h-auto rounded-2xl object-contain shadow-2xl shadow-black/30"
                    />
                  </div>
            ) : isProcessing ? (
              <div className="animate-fade-in flex items-center justify-center max-h-full">
                <LandingPreviewSkeleton inputImage={image} />
              </div>
            ) : (
              <div className="flex aspect-square max-w-[280px] max-h-[70vh] flex-col items-center justify-center gap-4 rounded-2xl bg-white/[0.03] transition-all duration-300 hover:bg-white/[0.06]">
                <div className="rounded-2xl bg-white/5 p-6">
                  <ImageIcon className="h-14 w-14 text-white/20" />
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-sm font-medium text-white/40">Your ad will appear here</p>
                  <p className="text-xs text-white/30">Complete the steps and click Generate Ad</p>
                </div>
              </div>
            )}
            </div>
            </div>
            <div className="shrink-0 flex flex-wrap gap-2 justify-center">
              {result?.imageUrl && result?.image2Url && (
                <>
                  {!mergedImageUrl ? (
                    <LandingMergeAndDownload 
                      imageUrl={result.imageUrl} 
                      image2Url={result.image2Url} 
                      onMerged={(url) => setMergedImageUrl(url)}
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setMergedImageUrl(null)}
                        className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] px-4 py-3 text-sm font-medium text-white transition-all hover:bg-white/[0.1]"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        View Separate
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = mergedImageUrl;
                          a.download = "landing-full.png";
                          a.click();
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-violet-500/20 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-violet-500/30"
                      >
                        <Download className="h-4 w-4" />
                        Download Merged
                      </button>
                    </>
                  )}
                </>
              )}
              {result?.refinedImageUrl && (
                <a
                  href={imageUrl(result.refinedImageUrl)}
                  download="ad-creative.png"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/[0.1]"
                >
                  <Download className="h-4 w-4" />
                  Download ad
                </a>
              )}
            </div>
          </div>
        </main>

        {/* Right: Logs panel */}
        <aside className="hidden lg:flex w-[360px] xl:w-[380px] shrink-0 flex-col border-l border-white/[0.06] bg-black/20 backdrop-blur-xl overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-violet-400" />
              <span className="font-semibold text-white">Logs & prompts</span>
            </div>
          </div>
          <div ref={promptLogRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Prompt log - landing page only */}
            {aspectRatio === "landing" && promptLog.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Prompt log</p>
                <div className="space-y-2">
                    {promptLog.map((entry, i) => (
                      <div
                        key={i}
                        className={cn(
                          "rounded-xl border transition-all duration-300 overflow-hidden",
                          promptExpanded === `${entry.step}-${i}`
                            ? "border-violet-500/30 bg-violet-500/5"
                            : "border-white/[0.06] bg-white/[0.04] hover:border-violet-500/20"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setPromptExpanded(promptExpanded === `${entry.step}-${i}` ? null : `${entry.step}-${i}`)}
                          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/20 text-violet-300 text-xs font-bold">
                              {i + 1}
                            </span>
                            <span className="font-medium text-white/90 truncate">{entry.label}</span>
                            <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/40 px-2 py-0.5 rounded bg-white/5">
                              {entry.step}
                            </span>
                          </div>
                          {promptExpanded === `${entry.step}-${i}` ? (
                            <ChevronUp className="h-4 w-4 shrink-0 text-white/40" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-white/40" />
                          )}
                        </button>
                        {promptExpanded === `${entry.step}-${i}` && (
                          <div className="px-4 pb-4 pt-0 border-t border-white/[0.06] space-y-3">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Prompt</p>
                              <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap break-words bg-black/30 rounded-lg p-4 overflow-x-auto max-h-48 overflow-y-auto">
                                {entry.prompt}
                              </pre>
                            </div>
                            {entry.output && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-emerald-400/80 mb-1">Output</p>
                                <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap break-words bg-emerald-950/40 rounded-lg p-4 overflow-x-auto max-h-48 overflow-y-auto border border-emerald-500/20">
                                  {entry.output}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Creative direction */}
            {result?.creativeOutput && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Creative direction</p>
                <details className="group rounded-xl bg-white/[0.04] border border-white/[0.06] overflow-hidden" open>
                    <summary className="cursor-pointer text-sm font-medium text-white/70 hover:text-white/90 transition-colors px-4 py-3">
                    View layout & styling specs
                  </summary>
                    <div className="px-4 pb-4 pt-0 space-y-3 text-sm text-white/50 border-t border-white/[0.06]">
                      <p><strong className="text-white/70">Accent:</strong> {safeRender(result.creativeOutput.accentColor)}</p>
                      <div>
                        <strong className="text-white/70">Headline:</strong>{" "}
                        {safeRender(result.creativeOutput.headline.font_family)} {safeRender(result.creativeOutput.headline.font_size)} @ {safeRender(result.creativeOutput.headline.position)}
                        {result.creativeOutput.headline.has_bold && <span> • bold: {safeRender(result.creativeOutput.headline.bold_where || "yes")}</span>}
                        {result.creativeOutput.headline.has_accent && <span> • accent: {safeRender(result.creativeOutput.headline.accent_where || "yes")}</span>}
                      </div>
                      <div>
                        <strong className="text-white/70">Subheadline:</strong>{" "}
                        {result.creativeOutput.subheadline.visible ? (
                          <>visible • {safeRender(result.creativeOutput.subheadline.font_family)} {safeRender(result.creativeOutput.subheadline.font_size)} @ {safeRender(result.creativeOutput.subheadline.position)}
                            {result.creativeOutput.subheadline.has_bold && <span> • bold: {safeRender(result.creativeOutput.subheadline.bold_where || "yes")}</span>}
                            {result.creativeOutput.subheadline.has_accent && <span> • accent: {safeRender(result.creativeOutput.subheadline.accent_where || "yes")}</span>}
                          </>
                        ) : (
                          "hidden (not used)"
                        )}
                      </div>
                      <div>
                        <strong className="text-white/70">Product:</strong> {safeRender(result.creativeOutput.product.position)} • zoom: {safeRender(result.creativeOutput.product.zoom)}
                        {result.creativeOutput.product.reversed && <span> • reversed</span>}
                        {result.creativeOutput.product.rotation != null && <span> • rotation: {safeRender(result.creativeOutput.product.rotation)}</span>}
                        {result.creativeOutput.product.focus != null && <span> • focus: {safeRender(result.creativeOutput.product.focus)}</span>}
                        {result.creativeOutput.product.treatment != null && <span> • treatment: {safeRender(result.creativeOutput.product.treatment)}</span>}
                      </div>
                      <p><strong className="text-white/70">Background:</strong> {safeRender(result.creativeOutput.background)}</p>
                      <div>
                        <strong className="text-white/70">CTA:</strong> {safeRender(result.creativeOutput.cta.style)} @ {safeRender(result.creativeOutput.cta.position)}
                        <span> • bg: {result.creativeOutput.cta.has_background ? "yes" : "no"}</span>
                        <span> • chip: {result.creativeOutput.cta.is_chip ? "yes" : "no"}</span>
                      </div>
                      <div>
                        <strong className="text-white/70">Price:</strong> {safeRender(result.creativeOutput.price.style)} @ {safeRender(result.creativeOutput.price.position)}
                        <span> • bg: {result.creativeOutput.price.has_background ? "yes" : "no"}</span>
                        <span> • chip: {result.creativeOutput.price.is_chip ? "yes" : "no"}</span>
                      </div>
                      <p><strong className="text-white/70">Effects:</strong> {safeRender(result.creativeOutput.effects)}</p>
                    </div>
                  </details>
              </div>
            )}

            {/* Copy output */}
            {result?.copyOutput && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Copy output</p>
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 space-y-2 text-sm">
                  <p className="font-semibold text-white">{safeRender(result.copyOutput.headline)}</p>
                  <p className="text-white/60">{safeRender(result.copyOutput.subheadline)}</p>
                  {(result.copyOutput.section3Headline || result.copyOutput.section3Subheadline) && (
                    <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                      <p className="text-xs uppercase text-white/40">Section 3</p>
                      {result.copyOutput.section3Headline && (
                        <p className="font-medium text-amber-400/90">{safeRender(result.copyOutput.section3Headline)}</p>
                      )}
                      {result.copyOutput.section3Subheadline && (
                        <p className="text-white/70 text-sm">{safeRender(result.copyOutput.section3Subheadline)}</p>
                      )}
                    </div>
                  )}
                  <p className="text-violet-400 font-medium">{safeRender(result.copyOutput.cta)}
                    {result.copyOutput.price && <span className="ml-1 font-bold text-white">{safeRender(result.copyOutput.price)}</span>}
                  </p>
                  {result.copyOutput.features && result.copyOutput.features.length > 0 && (
                    <ul className="mt-2 space-y-1.5 text-white/70">
                      {result.copyOutput.features.map((f, i) => {
                        const item = typeof f === "string" ? { icon: "check" as const, text: f } : f;
                        return (
                          <li key={i} className="flex gap-2 items-start">
                            {item.visual ? (
                              <span className="text-xs text-violet-400/80 italic shrink-0 mt-0.5">•</span>
                            ) : (
                              <FeatureIcon name={item.icon} />
                            )}
                            <div className="flex-1">
                              <span className="font-medium">{safeRender(item.text)}</span>
                              {item.visual && (
                                <p className="text-xs text-white/50 mt-0.5 italic">{safeRender(item.visual)}</p>
                              )}
                              {item.description && (
                                <p className="text-xs text-white/50 mt-0.5">{safeRender(item.description)}</p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Empty state when no logs */}
            {!promptLog.length && !result?.creativeOutput && !result?.copyOutput && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-10 w-10 text-white/20 mb-3" />
                <p className="text-sm text-white/40">Logs will appear here during generation</p>
                <p className="text-xs text-white/30 mt-1">Prompts, creative direction, and more</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
