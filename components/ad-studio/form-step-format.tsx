"use client";

import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATIC_ASPECT_RATIOS } from "./types";

const REPRESENTATION_HEIGHT = 64;
const SMALL_REPRESENTATION_HEIGHT = 48; // 1:1 and 4:5 use this so they appear smaller

function sizeForRatio(value: string): { width: number; height: number } {
  const h =
    value === "1:1" || value === "4:5" ? SMALL_REPRESENTATION_HEIGHT : REPRESENTATION_HEIGHT;
  switch (value) {
    case "1:1":
      return { width: h, height: h };
    case "4:5":
      return { width: (h * 4) / 5, height: h };
    case "9:16":
      return { width: (h * 9) / 16, height: h };
    case "16:9":
      return { width: (REPRESENTATION_HEIGHT * 16) / 9, height: REPRESENTATION_HEIGHT };
    default:
      return { width: h, height: h };
  }
}

function isLandscapeRatio(value: string) {
  return value === "16:9";
}

interface FormStepFormatProps {
  aspectRatio: string;
  setAspectRatio: (v: string) => void;
}

export function FormStepFormat({ aspectRatio, setAspectRatio }: FormStepFormatProps) {
  return (
    <div className="animate-step-in p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Aspect ratio</h2>
        <p className="mt-1 text-sm text-white/50">Choose output size</p>
      </div>
      <div className="space-y-3">
        <Label className="text-white/70 text-sm font-medium">Format</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {STATIC_ASPECT_RATIOS.map((r) => {
            const isSelected = aspectRatio === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setAspectRatio(r.value)}
                className={cn(
                  "group relative flex flex-col items-center gap-2 rounded-xl border-2 p-2 transition-all duration-200",
                  "bg-white/[0.04] border-white/10 hover:border-violet-500/50 hover:bg-violet-500/10",
                  isSelected && "border-violet-500 bg-violet-500/15 ring-2 ring-violet-500/30"
                )}
              >
                <div className="h-16 w-full flex items-center justify-center shrink-0 px-4">
                  <div
                    className="rounded-md overflow-hidden bg-gradient-to-br from-white/10 to-white/5 shrink-0"
                    style={
                      isLandscapeRatio(r.value)
                        ? { width: "100%", height: "auto", maxHeight: "100%", aspectRatio: "16/9" }
                        : sizeForRatio(r.value)
                    }
                  />
                </div>
                <span className="text-xs font-medium text-white/80 text-center leading-tight block w-full min-w-0">
                  {r.label}
                </span>
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-white">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
