"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import type { StaticDraftCopyOutput } from "./types";

function ensureBadges(draft: StaticDraftCopyOutput): string[] {
  if (Array.isArray(draft.badges) && draft.badges.length > 0) return draft.badges;
  if (draft.badge_text?.trim()) return [draft.badge_text.trim()];
  return [];
}

interface FormStepEditStaticCopyProps {
  draft: StaticDraftCopyOutput;
  setDraft: (d: StaticDraftCopyOutput | ((prev: StaticDraftCopyOutput) => StaticDraftCopyOutput)) => void;
}

/** Step 4: Hero — headline only */
export function FormStepEditStaticHero({ draft, setDraft }: FormStepEditStaticCopyProps) {
  return (
    <div className="animate-step-in p-6 sm:p-8 space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Hero</h2>
        <p className="mt-1 text-sm text-white/50">Main headline for the ad</p>
      </div>
      <div className="space-y-4">
        <Label htmlFor="headline" className="text-white/70 text-sm font-medium">Headline</Label>
        <Input
          id="headline"
          value={draft.headline ?? ""}
          onChange={(e) => setDraft((prev) => ({ ...prev, headline: e.target.value }))}
          placeholder="Main headline"
          className="rounded-xl bg-white/[0.06] text-white placeholder:text-white/30"
        />
      </div>
    </div>
  );
}

/** Step 5: Badges — multiple labels */
export function FormStepEditStaticBadges({ draft, setDraft }: FormStepEditStaticCopyProps) {
  const badges = ensureBadges(draft);
  const setBadge = (index: number, value: string) => {
    setDraft((prev) => {
      const list = [...ensureBadges(prev)];
      list[index] = value;
      const next = list.filter(Boolean);
      return { ...prev, badges: next, badge_text: next[0] ?? null };
    });
  };
  const addBadge = () => setDraft((prev) => ({ ...prev, badges: [...ensureBadges(prev), ""] }));
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
          {badges.length === 0 && <p className="text-sm text-white/40">No badges. Add one above.</p>}
        </div>
      </div>
    </div>
  );
}

/** Step 6: Body — subheadline, CTA, price */
export function FormStepEditStaticBody({ draft, setDraft }: FormStepEditStaticCopyProps) {
  const update = (patch: Partial<StaticDraftCopyOutput>) => setDraft((prev) => ({ ...prev, ...patch }));
  return (
    <div className="animate-step-in p-6 sm:p-8 space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Body</h2>
        <p className="mt-1 text-sm text-white/50">Subheadline, CTA and price</p>
      </div>
      <div className="space-y-4">
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
        <div className="space-y-2">
          <Label htmlFor="cta" className="text-white/70 text-sm font-medium">CTA button</Label>
          <Input
            id="cta"
            value={draft.cta ?? ""}
            onChange={(e) => update({ cta: e.target.value })}
            placeholder="e.g. Shop now"
            className="rounded-xl bg-white/[0.06] text-white placeholder:text-white/30"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price" className="text-white/70 text-sm font-medium">Price</Label>
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

/** Step 7: Features & additional text */
export function FormStepEditStaticFeatures({ draft, setDraft }: FormStepEditStaticCopyProps) {
  const additionalText = Array.isArray(draft.additional_text) ? draft.additional_text : [];
  const features = Array.isArray(draft.features) ? draft.features : [];

  const setAdditionalItem = (index: number, field: "label" | "content", value: string) => {
    setDraft((prev) => {
      const list = [...(Array.isArray(prev.additional_text) ? prev.additional_text : [])];
      if (!list[index]) list[index] = { label: "", content: "" };
      list[index] = { ...list[index], [field]: value };
      return { ...prev, additional_text: list };
    });
  };
  const addAdditional = () => {
    setDraft((prev) => ({
      ...prev,
      additional_text: [...(Array.isArray(prev.additional_text) ? prev.additional_text : []), { label: "", content: "" }],
    }));
  };
  const removeAdditional = (index: number) => {
    setDraft((prev) => {
      const list = (prev.additional_text ?? []).filter((_, i) => i !== index);
      return { ...prev, additional_text: list.length > 0 ? list : null };
    });
  };

  const setFeature = (index: number, value: string) => {
    setDraft((prev) => {
      const list = [...(prev.features ?? [])];
      list[index] = value;
      return { ...prev, features: list };
    });
  };
  const addFeature = () => setDraft((prev) => ({ ...prev, features: [...(prev.features ?? []), ""] }));
  const removeFeature = (index: number) => {
    setDraft((prev) => ({ ...prev, features: (prev.features ?? []).filter((_, i) => i !== index) }));
  };

  return (
    <div className="animate-step-in p-6 sm:p-8 space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Features & additional</h2>
        <p className="mt-1 text-sm text-white/50">Extra copy and feature bullets</p>
      </div>
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-violet-300">Additional text</h3>
            <Button type="button" size="sm" variant="ghost" onClick={addAdditional} className="text-white/70 hover:text-white hover:bg-white/10">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          <div className="space-y-3">
            {additionalText.map((item, i) => (
              <div key={i} className="flex gap-2 items-start rounded-xl bg-white/[0.06] p-3">
                <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                  <Input
                    value={item.label}
                    onChange={(e) => setAdditionalItem(i, "label", e.target.value)}
                    placeholder="Label"
                    className="rounded-lg bg-white/[0.08] text-white placeholder:text-white/30 text-sm"
                  />
                  <Input
                    value={item.content}
                    onChange={(e) => setAdditionalItem(i, "content", e.target.value)}
                    placeholder="Content"
                    className="rounded-lg bg-white/[0.08] text-white placeholder:text-white/30 text-sm"
                  />
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={() => removeAdditional(i)} className="shrink-0 text-white/50 hover:text-red-400 hover:bg-red-500/10" aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-violet-300">Features</h3>
            <Button type="button" size="sm" variant="ghost" onClick={addFeature} className="text-white/70 hover:text-white hover:bg-white/10">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          <div className="space-y-3">
            {features.map((f, i) => (
              <div key={i} className="flex gap-2 items-center rounded-xl bg-white/[0.06] p-3">
                <Input
                  value={f}
                  onChange={(e) => setFeature(i, e.target.value)}
                  placeholder="Feature"
                  className="rounded-lg bg-white/[0.08] text-white placeholder:text-white/30 text-sm flex-1"
                />
                <Button type="button" size="icon" variant="ghost" onClick={() => removeFeature(i)} className="shrink-0 text-white/50 hover:text-red-400 hover:bg-red-500/10" aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
