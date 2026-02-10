"use client";

import { Download, ChevronLeft, ImageIcon } from "lucide-react";
import { imageUrl as imageUrlFn } from "./utils";
import type { AdResult } from "./types";
import { LandingPreview, LandingPreviewSkeleton, LandingDownload } from "./landing-preview";

export interface ResultPreviewProps {
  result: AdResult | null;
  mergedImageUrl: string | null;
  setMergedImageUrl: (v: string | null) => void;
  image: string | null;
  isProcessing: boolean;
  resultRef?: React.RefObject<HTMLDivElement | null>;
}

export function ResultPreview({ result, mergedImageUrl, setMergedImageUrl, image, isProcessing, resultRef }: ResultPreviewProps) {
  const statusText = result?.refinedImageUrl
    ? "Your ad is ready"
    : result?.imageUrl
      ? "Your landing page is ready"
      : isProcessing
        ? "AI is creating your ad"
        : "Complete the steps to generate your ad";

  return (
    <main ref={resultRef} className="flex-1 min-w-0 min-h-0 flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="w-full max-w-xl h-full flex flex-col items-center justify-center gap-3 overflow-hidden">
        <p className="text-center text-sm text-white/50 shrink-0">{statusText}</p>
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
            ) : result?.imageUrl ? (
              <div className="animate-fade-in flex items-center justify-center max-h-full overflow-hidden p-4">
                <LandingPreview imageUrl={result.imageUrl} imageUrlFn={imageUrlFn} />
              </div>
            ) : result?.refinedImageUrl ? (
              <div className="animate-fade-in flex items-center justify-center">
                <img
                  src={imageUrlFn(result.refinedImageUrl ?? "")}
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
          {result?.imageUrl && (
            <>
              {!mergedImageUrl ? (
                <LandingDownload imageUrl={result.imageUrl} onDownloaded={() => {}} />
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
              href={imageUrlFn(result.refinedImageUrl)}
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
  );
}
