"use client";

import { Sparkles } from "lucide-react";

/** Parse a display price line into quantity and remainder (price + optional free shipping). */
function parseDisplayLine(line: string): { qty: number; pricePart: string; freeShipping: boolean } {
  const trimmed = line.trim();
  if (!trimmed) return { qty: 0, pricePart: "", freeShipping: false };
  const freeShipping = /\+\s*Free shipping/i.test(trimmed);
  const withoutShipping = trimmed.replace(/\s*\+\s*Free shipping\s*$/i, "").trim();
  // Match: optional digits + optional "for"|"×"|"x"|"pour"|"و"|"مقابل" etc. + price part
  const multiMatch = withoutShipping.match(/^(\d+)\s*(?:for|×|x|pour|و|مقابل|لـ)\s*(.+)$/i);
  if (multiMatch) return { qty: parseInt(multiMatch[1], 10) || 1, pricePart: multiMatch[2].trim(), freeShipping };
  return { qty: 1, pricePart: withoutShipping, freeShipping };
}

/** Extract a numeric value from a price string for comparison (e.g. "4 500" or "4,500" or "$99.99" -> 4500 / 99.99). */
function numericFromPrice(s: string): number | null {
  const normalized = s.replace(/\s/g, "").replace(/,/g, "");
  const match = normalized.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  return parseFloat(match[1].replace(",", "."));
}

/** True if the line already ends with or contains a known currency (code or symbol). */
function lineHasCurrency(line: string): boolean {
  const t = line.trim();
  return (
    /\b(USD|EUR|DZD)\s*$/i.test(t) ||
    /(€|\$)\s*$/.test(t) ||
    /\s*دج\s*$/.test(t) ||
    /[\d,.\s]+(USD|EUR|DZD|€|\$|دج)(\s|$)/i.test(t)
  );
}

/** Ensure the display line shows price + currency. If currency prop is set and line has none, append it. */
function formatLineWithCurrency(line: string, currency?: string): string {
  if (!currency?.trim()) return line;
  if (lineHasCurrency(line)) return line;
  const trimmed = line.trim();
  return trimmed ? `${trimmed} ${currency.trim()}` : line;
}

export interface PriceDisplayProps {
  /** Raw price string (multi-line allowed). */
  value: string;
  /** Optional display transform (e.g. for RTL / "(empty)"). */
  displayValue?: (raw: string) => string;
  /** When set, each line is shown with this currency if it doesn't already include one. */
  currency?: string;
  className?: string;
}

export function PriceDisplay({ value, displayValue = (s) => s, currency, className = "" }: PriceDisplayProps) {
  const raw = typeof value === "string" ? value : "";
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const parsed = lines.map((line) => {
    const displayLine = formatLineWithCurrency(line, currency);
    const { qty, pricePart, freeShipping } = parseDisplayLine(displayLine);
    const num = numericFromPrice(pricePart);
    const unitPrice = qty > 0 && num != null ? num / qty : null;
    return { line: displayLine, qty, pricePart, freeShipping, unitPrice };
  });

  let bestIndex = -1;
  if (parsed.length >= 2) {
    let minUnit = Infinity;
    parsed.forEach((p, i) => {
      if (p.unitPrice != null && p.unitPrice < minUnit) {
        minUnit = p.unitPrice;
        bestIndex = i;
      }
    });
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {parsed.map((p, i) => {
          const isBest = p.unitPrice != null && i === bestIndex;
          return (
            <div
              key={i}
              className={`
                inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium
                ${isBest
                  ? "bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-[0_0_12px_rgba(251,191,36,0.15)]"
                  : "bg-white/[0.06] text-white/90 border border-white/[0.08]"
                }
              `}
            >
              <span className="whitespace-nowrap">{displayValue(p.line)}</span>
              {isBest && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/30 px-2 py-0.5 text-xs font-semibold text-amber-200">
                  <Sparkles className="h-3 w-3" />
                  Best value
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
