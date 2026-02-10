"use client";

import { Image, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { AD_TYPES } from "./types";
import type { AdType } from "./use-ad-generation";

interface FormStepTypeProps {
  adType: AdType;
  setAdType: (v: AdType) => void;
  onSelect: () => void;
}

export function FormStepType({ adType, setAdType, onSelect }: FormStepTypeProps) {
  const handleSelect = (value: "static" | "landing") => {
    setAdType(value);
    onSelect();
  };

  return (
    <div className="animate-step-in p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Ad type</h2>
        <p className="mt-1 text-sm text-white/50">Choose static ad or full landing page</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {AD_TYPES.map((t) => {
          const isSelected = adType === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => handleSelect(t.value)}
              className={cn(
                "flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200",
                "bg-white/[0.04] border-white/10 hover:border-violet-500/50 hover:bg-violet-500/10",
                isSelected && "border-violet-500 bg-violet-500/15 ring-2 ring-violet-500/30"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  isSelected ? "bg-violet-500 text-white" : "bg-white/10 text-white/70"
                )}
              >
                {t.value === "static" ? (
                  <Image className="h-5 w-5" />
                ) : (
                  <Globe className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-white block">{t.label}</span>
                <span className="text-sm text-white/50 block mt-0.5">{t.description}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
