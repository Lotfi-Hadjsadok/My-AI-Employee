"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";

export interface PriceRow {
  quantity: string;
  price: string;
  freeShipping: boolean;
}

function parsePriceLine(line: string): PriceRow {
  const trimmed = line.trim();
  if (!trimmed) return { quantity: "", price: "", freeShipping: false };
  const freeShipping = /\+\s*Free shipping/i.test(trimmed);
  const withoutShipping = trimmed.replace(/\s*\+\s*Free shipping\s*$/i, "").trim();
  // Support both legacy "2 for 4500" style and newer "2 × 4,500" / "2 x 4,500" style.
  const match = withoutShipping.match(/^(\d+)\s*(?:for|×|x|pour|و|مقابل|لـ)\s+(.+)$/i);
  if (match) return { quantity: match[1], price: match[2].trim(), freeShipping };
  return { quantity: "1", price: trimmed, freeShipping };
}

function serializeRow(row: PriceRow): string {
  if (!row.quantity.trim() && !row.price.trim()) return "";
  const q = row.quantity.trim() || "1";
  const p = row.price.trim();
  if (!p) return "";
  const suffix = row.freeShipping ? " + Free shipping" : "";
  // Let the price text itself be more flexible:
  // - Single quantity: just show the price ("$25", "2 500 DZD")
  // - Multi-quantity: use a compact "2 × $40" style instead of "2 for $40"
  if (q === "1") return `${p}${suffix}`;
  return `${q} × ${p}${suffix}`;
}

function parseValue(value: string): PriceRow[] {
  const lines = value.split("\n").map((l) => l.trim());
  if (lines.length === 0) return [{ quantity: "", price: "", freeShipping: false }];
  return lines.map((l) => parsePriceLine(l || " "));
}

function serializeRows(rows: PriceRow[]): string {
  return rows.map(serializeRow).join("\n");
}

interface PriceRepeaterProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  label?: string;
}

export function PriceRepeater({
  value,
  onChange,
  id = "price",
  label = "Price (optional)",
}: PriceRepeaterProps) {
  const rows = parseValue(value);

  const setRow = (index: number, patch: Partial<PriceRow>) => {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange(serializeRows(next));
  };

  const addRow = () => {
    const next = [...rows, { quantity: "", price: "", freeShipping: false }];
    onChange(serializeRows(next));
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) {
      onChange("");
      return;
    }
    const next = rows.filter((_, i) => i !== index);
    onChange(serializeRows(next));
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-white/70 text-sm font-medium">
        {label}
      </Label>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-xl bg-white/[0.04] p-3">
            <div className="flex gap-2 items-center">
              <div className="flex gap-2 items-center flex-1 min-w-0">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={row.quantity}
                  onChange={(e) => setRow(index, { quantity: e.target.value })}
                  placeholder="Qty"
                  className="rounded-lg bg-white/[0.06] text-white placeholder:text-white/30 w-16 shrink-0"
                />
                <span className="text-white/50 text-sm shrink-0">×</span>
                <Input
                  id={index === 0 ? id : undefined}
                  type="text"
                  value={row.price}
                  onChange={(e) => setRow(index, { price: e.target.value })}
                  placeholder="Price"
                  className="rounded-lg bg-white/[0.06] text-white placeholder:text-white/30 flex-1 min-w-0"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(index)}
                disabled={rows.length <= 1}
                className="shrink-0 text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30 h-10 w-10"
                aria-label="Remove row"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={row.freeShipping}
                onCheckedChange={(checked) => setRow(index, { freeShipping: checked })}
              />
              <span className="text-sm text-white/70">Free shipping</span>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            addRow();
          }}
          className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add price line
        </Button>
      </div>
    </div>
  );
}
