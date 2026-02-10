"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";

export function LandingPreviewSkeleton({ inputImage }: { inputImage?: string | null }) {
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

export function LandingPreview({ imageUrl, imageUrlFn }: { imageUrl?: string; imageUrlFn: (url: string) => string }) {
  if (!imageUrl) return null;
  return (
    <div className="flex flex-col gap-4 items-center max-w-full max-h-[75vh] overflow-hidden">
      {imageUrl && (
        <img
          src={imageUrlFn(imageUrl)}
          alt="Landing page"
          className="max-w-full max-h-[75vh] w-auto h-auto rounded-2xl object-contain shadow-2xl shadow-black/30"
        />
      )}
    </div>
  );
}

export function LandingDownload({ imageUrl, onDownloaded }: { imageUrl?: string; onDownloaded?: () => void }) {
  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = "landing-full.png";
    a.click();
    onDownloaded?.();
  };

  if (!imageUrl) return null;

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <button
        type="button"
        onClick={handleDownload}
        className="inline-flex items-center gap-2 rounded-xl bg-violet-500/20 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-violet-500/30"
      >
        <Download className="h-4 w-4" />
        Download
      </button>
    </div>
  );
}
