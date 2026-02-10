"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ChevronLeft, ChevronRight, Sparkles, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineStage, DraftCopyOutput } from "./types";
import { FORM_STEPS, FORM_STEPS_LANDING, FORM_STEPS_STATIC } from "./types";
import type { StaticDraftCopyOutput } from "./types";
import { PipelineStepper } from "./pipeline-stepper";
import { FormStepUpload } from "./form-step-upload";
import { FormStepFormat } from "./form-step-format";
import { FormStepLanguage } from "./form-step-language";
import { FormStepReview } from "./form-step-review";
import { FormStepLandingOne } from "./form-step-landing-one";
import {
  FormStepEditCopyHero,
  FormStepEditCopyBadges,
  FormStepEditCopyFeatures,
  FormStepEditCopyCta,
} from "./form-step-edit-copy";
import {
  FormStepEditStaticHero,
  FormStepEditStaticBadges,
  FormStepEditStaticBody,
  FormStepEditStaticFeatures,
} from "./form-step-edit-static-copy";
import { FormStepType } from "./form-step-type";
import type { AdType } from "./use-ad-generation";

export interface SidebarFormProps {
  formStep: number;
  goToStep: (step: number) => void;
  canProceed: () => boolean;
  totalSteps: number;
  adType: AdType;
  setAdType: (v: AdType) => void;
  isLanding: boolean;
  image: string | null;
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  productFeatures: string;
  setProductFeatures: (v: string) => void;
  price: string;
  setPrice: (v: string) => void;
  aspectRatio: string;
  setAspectRatio: (v: string) => void;
  copyLanguage: string;
  setCopyLanguage: (v: string) => void;
  arabicDialect: string;
  setArabicDialect: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  draftCopyOutput: DraftCopyOutput | null;
  setDraftCopyOutput: (v: DraftCopyOutput | null | ((prev: DraftCopyOutput | null) => DraftCopyOutput | null)) => void;
  staticDraftCopyOutput: StaticDraftCopyOutput | null;
  setStaticDraftCopyOutput: (v: StaticDraftCopyOutput | null | ((prev: StaticDraftCopyOutput | null) => StaticDraftCopyOutput | null)) => void;
  stage: PipelineStage;
  error: string | null;
  setError: (v: string | null) => void;
  isProcessing: boolean;
  canRetry: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onClearImage: () => void;
  onGenerateCopy?: () => void;
  onGenerateStaticCopy?: () => void;
  onGenerate: () => void;
  onRetry: () => void;
}

export function SidebarForm({
  formStep,
  goToStep,
  canProceed,
  totalSteps,
  adType,
  setAdType,
  isLanding,
  image,
  isDragging,
  fileInputRef,
  productFeatures,
  setProductFeatures,
  price,
  setPrice,
  aspectRatio,
  setAspectRatio,
  copyLanguage,
  setCopyLanguage,
  arabicDialect,
  setArabicDialect,
  currency,
  setCurrency,
  draftCopyOutput,
  setDraftCopyOutput,
  staticDraftCopyOutput,
  setStaticDraftCopyOutput,
  stage,
  error,
  setError,
  isProcessing,
  canRetry,
  onFileChange,
  onDrop,
  onDragOver,
  onDragLeave,
  onClearImage,
  onGenerateCopy,
  onGenerateStaticCopy,
  onGenerate,
  onRetry,
}: SidebarFormProps) {
  const steps = adType === null ? [FORM_STEPS[0]] : isLanding ? FORM_STEPS_LANDING : FORM_STEPS_STATIC;
  const isLastStep = formStep === totalSteps;

  return (
    <aside className="w-[360px] md:w-[420px] shrink-0 flex flex-col border-r border-white/[0.06] bg-black/20 backdrop-blur-xl overflow-hidden">
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-400" />
          <span className="font-semibold text-white">Product Ad Studio</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-1">
            {steps.map((s, i) => {
              const isActive = formStep === s.id;
              const isComplete = formStep > s.id;
              const isClickable = formStep >= s.id;
              return (
                <div key={s.id} className="flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => isClickable && goToStep(s.id)}
                    title={`${s.title}: ${s.subtitle}`}
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                      isActive && "bg-violet-500 text-white ring-2 ring-violet-400/50",
                      isComplete && "bg-violet-500/80 text-white",
                      !isActive && !isComplete && "bg-white/10 text-white/60",
                      isClickable && "hover:bg-white/20 cursor-pointer",
                      !isClickable && "cursor-default"
                    )}
                  >
                    {isComplete ? <Check className="h-4 w-4" /> : <span className="text-xs font-medium">{s.id}</span>}
                  </button>
                  {i < steps.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 min-w-[8px] max-w-[24px] rounded-full transition-colors",
                        formStep > s.id ? "bg-violet-500/60" : "bg-white/10"
                      )}
                      aria-hidden
                    />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-white/50 truncate" title={steps.find((s) => s.id === formStep)?.subtitle}>
            {steps.find((s) => s.id === formStep)?.title}
          </p>
        </div>

        <Card className="bg-white/[0.06] backdrop-blur-xl shadow-2xl shadow-black/30 shrink-0">
          <CardContent className="p-0">
            {formStep === 1 && (
              <FormStepType
                adType={adType}
                setAdType={setAdType}
                onSelect={() => goToStep(2)}
              />
            )}
            {isLanding && formStep === 2 && (
              <FormStepLandingOne
                image={image}
                isDragging={isDragging}
                fileInputRef={fileInputRef}
                onFileChange={onFileChange}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClearImage={onClearImage}
                price={price}
                setPrice={setPrice}
                copyLanguage={copyLanguage}
                setCopyLanguage={setCopyLanguage}
                arabicDialect={arabicDialect}
                setArabicDialect={setArabicDialect}
                currency={currency}
                setCurrency={setCurrency}
              />
            )}
            {isLanding && formStep === 3 && draftCopyOutput && (
              <FormStepEditCopyHero draft={draftCopyOutput} setDraft={setDraftCopyOutput} />
            )}
            {isLanding && formStep === 4 && draftCopyOutput && (
              <FormStepEditCopyBadges draft={draftCopyOutput} setDraft={setDraftCopyOutput} />
            )}
            {isLanding && formStep === 5 && draftCopyOutput && (
              <FormStepEditCopyFeatures draft={draftCopyOutput} setDraft={setDraftCopyOutput} />
            )}
            {isLanding && formStep === 6 && draftCopyOutput && (
              <FormStepEditCopyCta draft={draftCopyOutput} setDraft={setDraftCopyOutput} />
            )}
            {!isLanding && adType === "static" && formStep === 2 && (
              <FormStepFormat aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} />
            )}
            {!isLanding && adType === "static" && formStep === 3 && (
              <FormStepLanguage
                copyLanguage={copyLanguage}
                setCopyLanguage={setCopyLanguage}
                arabicDialect={arabicDialect}
                setArabicDialect={setArabicDialect}
                currency={currency}
                setCurrency={setCurrency}
              />
            )}
            {!isLanding && adType === "static" && formStep === 5 && !staticDraftCopyOutput && (
              <div className="animate-step-in p-6 sm:p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-white">Generate copy first</h2>
                  <p className="mt-1 text-sm text-white/50">We’ll create headline, CTA, and features. You can edit in the next steps before generating the image.</p>
                </div>
              </div>
            )}
            {!isLanding && adType === "static" && formStep === 5 && staticDraftCopyOutput && (
              <FormStepEditStaticHero draft={staticDraftCopyOutput} setDraft={setStaticDraftCopyOutput} />
            )}
            {!isLanding && adType === "static" && formStep === 6 && staticDraftCopyOutput && (
              <FormStepEditStaticBadges draft={staticDraftCopyOutput} setDraft={setStaticDraftCopyOutput} />
            )}
            {!isLanding && adType === "static" && formStep === 7 && staticDraftCopyOutput && (
              <FormStepEditStaticBody draft={staticDraftCopyOutput} setDraft={setStaticDraftCopyOutput} />
            )}
            {!isLanding && adType === "static" && formStep === 8 && staticDraftCopyOutput && (
              <FormStepEditStaticFeatures draft={staticDraftCopyOutput} setDraft={setStaticDraftCopyOutput} />
            )}
            {!isLanding && adType === "static" && formStep === 4 && (
              <FormStepUpload
                image={image}
                isDragging={isDragging}
                fileInputRef={fileInputRef}
                onFileChange={onFileChange}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClearImage={onClearImage}
                price={price}
                setPrice={setPrice}
              />
            )}
            {!isLanding && adType === "static" && formStep === 9 && (
              <FormStepReview
                image={image}
                aspectRatio={aspectRatio}
                copyLanguage={copyLanguage}
                price={price}
              />
            )}

            {error && (
              <div className="mx-6 mb-4 flex items-center justify-between gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <span className="flex flex-1 items-center gap-2 min-w-0">
                  <span className="shrink-0 rounded-full bg-red-500/20 p-1 text-xs">!</span>
                  <span className="truncate">{error}</span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {canRetry && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={onRetry}
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

            <div className="flex items-center justify-between gap-4 p-6 pt-0 mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (formStep === 2) setAdType(null);
                  goToStep(formStep - 1);
                }}
                disabled={formStep === 1}
                className="text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              {!isLastStep ? (
                formStep === 1 ? (
                  <span className="text-xs text-white/40">Select an option above</span>
                ) : isLanding && formStep === 2 ? (
                  <Button
                    type="button"
                    onClick={onGenerateCopy}
                    disabled={!image || isProcessing}
                    className="bg-violet-500 text-white hover:bg-violet-600 px-6"
                  >
                    {stage === "copy" ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Generating copy...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        Generate copy
                      </>
                    )}
                  </Button>
                ) : !isLanding && adType === "static" && formStep === 5 && !staticDraftCopyOutput ? (
                  <Button
                    type="button"
                    onClick={onGenerateStaticCopy}
                    disabled={!image || isProcessing}
                    className="bg-violet-500 text-white hover:bg-violet-600 px-6"
                  >
                    {stage === "copy" ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Generating copy...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        Generate copy
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => goToStep(formStep + 1)}
                    disabled={!canProceed()}
                    className="bg-violet-500 text-white hover:bg-violet-600 px-6"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )
              ) : (
                <Button
                  onClick={onGenerate}
                  disabled={!image || isProcessing}
                  className="bg-violet-500 text-white hover:bg-violet-600 px-6"
                >
                  {stage === "idle" || stage === "error" ? (
                    <>
                      <Sparkles className="h-5 w-5" />
                      {isLanding ? "Approve & generate ad" : "Generate Ad"}
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

            {isProcessing && (
              <div className="space-y-3 rounded-2xl bg-violet-500/[0.06] p-4 mx-4 mb-4 mt-4">
                {stage !== "generating" && (
                  <>
                    <p className="text-sm font-medium text-white/70">Pipeline</p>
                    <PipelineStepper currentStage={stage} />
                  </>
                )}
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
  );
}
