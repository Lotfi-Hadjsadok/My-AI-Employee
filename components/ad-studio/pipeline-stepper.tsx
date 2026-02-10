"use client";

import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineStage } from "./types";
import { STAGES } from "./types";

export function PipelineStepper({
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
