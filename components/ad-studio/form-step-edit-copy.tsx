"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { copyDisplayValue } from "./utils";
import type { DraftCopyOutput } from "./types";

export function ensureFeatures(draft: DraftCopyOutput): Array<{ visual?: string; text: string; description?: string }> {
  const f = draft.features;
  if (Array.isArray(f) && f.length > 0) {
    return f.map((item) =>
      typeof item === "string" ? { text: item } : { visual: item.visual, text: item.text, description: item.description }
    );
  }
  return [];
}

function ensureBadges(draft: DraftCopyOutput): string[] {
  if (Array.isArray(draft.badges) && draft.badges.length > 0) return draft.badges;
  if (draft.badge_text?.trim()) return [draft.badge_text.trim()];
  return [];
}

interface FormStepEditCopyProps {
  draft: DraftCopyOutput;
  setDraft: (d: DraftCopyOutput | ((prev: DraftCopyOutput) => DraftCopyOutput)) => void;
}

/** Step 3: Hero — headline & subheadline */
export function FormStepEditCopyHero({ draft, setDraft }: FormStepEditCopyProps) {
  const update = (patch: Partial<DraftCopyOutput>) => setDraft((prev) => ({ ...prev, ...patch }));
  return (
    <div className="animate-step-in p-6 sm:p-8 space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Hero</h2>
        <p className="mt-1 text-sm text-white/50">Headline and subheadline for the top section</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="headline" className="text-white/70 text-sm font-medium">Headline</Label>
          <Input
            id="headline"
            value={draft.headline ?? ""}
            onChange={(e) => update({ headline: e.target.value })}
            placeholder="Main headline"
            className="rounded-xl bg-white/[0.06] text-white placeholder:text-white/30"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subheadline" className="text-white/70 text-sm font-medium">Subheadline</Label>
          <Input
            id="subheadline"
            value={draft.subheadline ?? ""}
            onChange={(e) => update({ subheadline: e.target.value })}
            placeholder="Supporting line"
            className="rounded-xl bg-white/[0.06] text-white placeholder:text-white/30"
          />
        </div>
      </div>
    </div>
  );
}

/** Step 4: Badges — multiple labels */
export function FormStepEditCopyBadges({ draft, setDraft }: FormStepEditCopyProps) {
  const badges = ensureBadges(draft);
  const setBadge = (index: number, value: string) => {
    setDraft((prev) => {
      const list = [...ensureBadges(prev)];
      list[index] = value;
      const next = list.filter(Boolean);
      return { ...prev, badges: next, badge_text: next[0] ?? null };
    });
  };
  const addBadge = () => {
    setDraft((prev) => {
      const next = [...ensureBadges(prev), ""];
      const firstNonEmpty = next.filter(Boolean)[0] ?? null;
      return { ...prev, badges: next, badge_text: firstNonEmpty };
    });
  };
  const removeBadge = (index: number) => {
    setDraft((prev) => {
      const next = ensureBadges(prev).filter((_, i) => i !== index);
      return { ...prev, badges: next, badge_text: next[0] ?? null };
    });
  };
  return (
    <div className="animate-step-in p-6 sm:p-8 space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Badges</h2>
        <p className="mt-1 text-sm text-white/50">Labels like “New”, “Sale” — add as many as you need</p>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-violet-300">Badge labels</h3>
          <Button type="button" size="sm" variant="ghost" onClick={addBadge} className="text-white/70 hover:text-white hover:bg-white/10">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <div className="space-y-3">
          {badges.map((b, i) => (
            <div key={i} className="flex gap-2 items-center rounded-xl bg-white/[0.06] p-3">
              <Input
                value={b}
                onChange={(e) => setBadge(i, e.target.value)}
                placeholder="e.g. New, Sale"
                className="rounded-lg bg-white/[0.08] text-white placeholder:text-white/30 text-sm flex-1"
              />
              <Button type="button" size="icon" variant="ghost" onClick={() => removeBadge(i)} className="shrink-0 text-white/50 hover:text-red-400 hover:bg-red-500/10" aria-label="Remove badge">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {badges.length === 0 && (
            <p className="text-sm text-white/40">No badges. Add one above.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Step 5: Features */
export function FormStepEditCopyFeatures({ draft, setDraft }: FormStepEditCopyProps) {
  const features = ensureFeatures(draft);
  const setFeature = (index: number, field: "text" | "description", value: string) => {
    setDraft((prev) => {
      const list = ensureFeatures(prev);
      const next = [...list];
      if (!next[index]) next[index] = { text: "" };
      next[index] = { ...next[index], [field]: value };
      return { ...prev, features: next };
    });
  };
  const addFeature = () => setDraft((prev) => ({ ...prev, features: [...ensureFeatures(prev), { text: "" }] }));
  const removeFeature = (index: number) => {
    setDraft((prev) => ({ ...prev, features: ensureFeatures(prev).filter((_, i) => i !== index) }));
  };
  return (
    <div className="animate-step-in p-6 sm:p-8 space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Features</h2>
        <p className="mt-1 text-sm text-white/50">Feature list for the middle section</p>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-violet-300">Features section</h3>
          <Button type="button" size="sm" variant="ghost" onClick={addFeature} className="text-white/70 hover:text-white hover:bg-white/10">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <div className="space-y-3">
          {features.map((f, i) => (
            <div key={i} className="flex gap-2 items-start rounded-xl bg-white/[0.06] p-3">
              <div className="flex-1 space-y-2 min-w-0">
                <Input
                  value={f.text}
                  onChange={(e) => setFeature(i, "text", e.target.value)}
                  placeholder="Feature (2–5 words)"
                  className="rounded-lg bg-white/[0.08] text-white placeholder:text-white/30 text-sm"
                />
                <Input
                  value={f.description ?? ""}
                  onChange={(e) => setFeature(i, "description", e.target.value)}
                  placeholder="Description (optional)"
                  className="rounded-lg bg-white/[0.08] text-white placeholder:text-white/30 text-sm"
                />
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => removeFeature(i)} className="shrink-0 text-white/50 hover:text-red-400 hover:bg-red-500/10" aria-label="Remove feature">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {features.length === 0 && <p className="text-sm text-white/40">No features yet. Add one above.</p>}
        </div>
      </div>
    </div>
  );
}

/** Step 6: CTA — section headline, subheadline, CTA button, price */
export function FormStepEditCopyCta({ draft, setDraft }: FormStepEditCopyProps) {
  const update = (patch: Partial<DraftCopyOutput>) => setDraft((prev) => ({ ...prev, ...patch }));
  return (
    <div className="animate-step-in p-6 sm:p-8 space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">CTA</h2>
        <p className="mt-1 text-sm text-white/50">Section headline, CTA button and price</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="section3Headline" className="text-white/70 text-sm font-medium">Section headline (2–5 words)</Label>
          <Input
            id="section3Headline"
            value={draft.section3Headline ?? ""}
            onChange={(e) => update({ section3Headline: e.target.value })}
            placeholder="e.g. Limited time offer"
            className="rounded-xl bg-white/[0.06] text-white placeholder:text-white/30"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="section3Subheadline" className="text-white/70 text-sm font-medium">Section subheadline</Label>
          <Input
            id="section3Subheadline"
            value={draft.section3Subheadline ?? ""}
            onChange={(e) => update({ section3Subheadline: e.target.value })}
            placeholder="Reassurance or benefit"
            className="rounded-xl bg-white/[0.06] text-white placeholder:text-white/30"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cta" className="text-white/70 text-sm font-medium">CTA button text</Label>
          <Input
            id="cta"
            value={draft.cta ?? ""}
            onChange={(e) => update({ cta: e.target.value })}
            placeholder="e.g. Shop now"
            className="rounded-xl bg-white/[0.06] text-white placeholder:text-white/30"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price" className="text-white/70 text-sm font-medium">
            Price
          </Label>
          <Input
            id="price"
            value={draft.price ?? ""}
            onChange={(e) => update({ price: e.target.value })}
            placeholder="e.g. 2 × 4,500 DZD + Free shipping"
            className="rounded-xl bg-white/[0.06] text-white placeholder:text-white/30"
          />
        </div>
      </div>
    </div>
  );
}
