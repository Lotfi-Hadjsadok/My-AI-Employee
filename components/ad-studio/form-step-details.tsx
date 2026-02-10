"use client";

import { Label } from "@/components/ui/label";
import { PriceRepeater } from "./price-repeater";

interface FormStepDetailsProps {
  productFeatures: string;
  setProductFeatures: (v: string) => void;
  price: string;
  setPrice: (v: string) => void;
}

export function FormStepDetails({ productFeatures, setProductFeatures, price, setPrice }: FormStepDetailsProps) {
  return (
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
        <PriceRepeater id="price" value={price} onChange={setPrice} label="Price" />
      </div>
    </div>
  );
}
