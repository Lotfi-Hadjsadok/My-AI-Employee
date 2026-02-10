"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PriceRepeater } from "./price-repeater";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES, ARABIC_DIALECTS, CURRENCIES } from "./types";

const DEFAULT_CURRENCY_BY_LANG: Record<string, string> = { en: "USD", fr: "EUR", ar: "DZD" };

interface FormStepLandingOneProps {
  image: string | null;
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onClearImage: () => void;
  price: string;
  setPrice: (v: string) => void;
  copyLanguage: string;
  setCopyLanguage: (v: string) => void;
  arabicDialect: string;
  setArabicDialect: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
}

export function FormStepLandingOne({
  image,
  isDragging,
  fileInputRef,
  onFileChange,
  onDrop,
  onDragOver,
  onDragLeave,
  onClearImage,
  price,
  setPrice,
  copyLanguage,
  setCopyLanguage,
  arabicDialect,
  setArabicDialect,
  currency,
  setCurrency,
}: FormStepLandingOneProps) {
  return (
    <div className="animate-step-in p-6 sm:p-8 space-y-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">Image & price</h2>
        <p className="mt-1 text-sm text-white/50">Upload product image and basics — we’ll generate copy next</p>
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
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          "group relative flex aspect-square max-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl transition-all duration-300 outline-none",
          !image && "bg-white/[0.04] hover:bg-violet-500/[0.06]",
          isDragging && "bg-violet-500/10 scale-[1.02]"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
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
                  onClearImage();
                }}
              >
                <X className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </>
        ) : (
          <>
            <Upload className={cn("h-10 w-10", isDragging ? "text-violet-400" : "text-white/40")} />
            <span className={cn("mt-2 text-sm", isDragging ? "text-violet-400" : "text-white/60")}>
              {isDragging ? "Drop here" : "Drop image or click"}
            </span>
          </>
        )}
      </div>

      <PriceRepeater
        id="landing-price"
        value={price}
        onChange={setPrice}
        label="Price (optional)"
      />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-white/70 text-sm font-medium">Copy language</Label>
          <Select
            value={copyLanguage}
            onValueChange={(v) => {
              setCopyLanguage(v);
              if (v !== "ar") setArabicDialect("algerian");
              setCurrency(DEFAULT_CURRENCY_BY_LANG[v] ?? "USD");
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
        <div className="space-y-2">
          <Label className="text-white/70 text-sm font-medium">Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="rounded-xl bg-white/[0.06] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-zinc-900">
              {CURRENCIES.map((c) => (
                <SelectItem key={c.value} value={c.value} className="text-white">
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
