"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES, ARABIC_DIALECTS, CURRENCIES } from "./types";

const DEFAULT_CURRENCY_BY_LANG: Record<string, string> = { en: "USD", fr: "EUR", ar: "DZD" };

interface FormStepLanguageProps {
  copyLanguage: string;
  setCopyLanguage: (v: string) => void;
  arabicDialect: string;
  setArabicDialect: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
}

export function FormStepLanguage({
  copyLanguage,
  setCopyLanguage,
  arabicDialect,
  setArabicDialect,
  currency,
  setCurrency,
}: FormStepLanguageProps) {
  const handleLanguageChange = (v: string) => {
    setCopyLanguage(v);
    if (v !== "ar") setArabicDialect("algerian");
    setCurrency(DEFAULT_CURRENCY_BY_LANG[v] ?? "USD");
  };

  return (
    <div className="animate-step-in p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Copy language</h2>
        <p className="mt-1 text-sm text-white/50">Choose the language and currency for your ad copy</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-white/70 text-sm font-medium">Language</Label>
          <Select value={copyLanguage} onValueChange={handleLanguageChange}>
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
