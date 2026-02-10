"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PipelineStage } from "./types";
import { STAGES } from "./types";

export function PipelineSkeleton({
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
