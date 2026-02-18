"use client";

import { ASPECT_RATIOS, LANGUAGES, CURRENCIES } from "./types";
import { PriceDisplay } from "./price-display";

interface FormStepReviewProps {
  image: string | null;
  aspectRatio: string;
  copyLanguage: string;
  price: string;
  currency?: string;
}

export function FormStepReview({ image, aspectRatio, copyLanguage, price, currency }: FormStepReviewProps) {
  const currencyLabel = currency ? CURRENCIES.find((c) => c.value === currency)?.label ?? currency : null;
  return (
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
          <p>
            <span className="text-white/50">Format:</span>{" "}
            <span className="text-white">{ASPECT_RATIOS.find((r) => r.value === aspectRatio)?.label}</span>
          </p>
          <p>
            <span className="text-white/50">Language:</span>{" "}
            <span className="text-white">{LANGUAGES.find((l) => l.value === copyLanguage)?.label}</span>
          </p>
          {price && (
            <div className="flex flex-col gap-1.5 sm:gap-2">
              <p className="text-white/50">
                Price{currencyLabel ? ` (${currencyLabel})` : ""}:
              </p>
              <PriceDisplay value={price} currency={currency} className="mt-0" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
