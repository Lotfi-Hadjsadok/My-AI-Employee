"use client";

import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { safeRender, copyDisplayValue } from "./utils";
import { FeatureIcon } from "./feature-icon";
import { PriceDisplay } from "./price-display";
import type { AdResult, PromptLogEntry, DraftCopyOutput } from "./types";

export interface LogsPanelProps {
  promptLog: PromptLogEntry[];
  promptExpanded: string | null;
  setPromptExpanded: (v: string | null) => void;
  result: AdResult | null;
  promptLogRef: React.RefObject<HTMLDivElement | null>;
  isLanding?: boolean;
  draftCopyOutput?: DraftCopyOutput | null;
}

export function LogsPanel({
  promptLog,
  promptExpanded,
  setPromptExpanded,
  result,
  promptLogRef,
  isLanding,
  draftCopyOutput,
}: LogsPanelProps) {
  return (
    <aside className="hidden lg:flex w-[360px] xl:w-[380px] shrink-0 flex-col border-l border-white/[0.06] bg-black/20 backdrop-blur-xl overflow-hidden">
      <div className="p-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-violet-400" />
          <span className="font-semibold text-white">Logs & prompts</span>
        </div>
      </div>
      <div ref={promptLogRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {promptLog.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Prompt log</p>
            <div className="space-y-2">
              {promptLog.map((entry, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl border transition-all duration-300 overflow-hidden",
                    promptExpanded === `${entry.step}-${i}`
                      ? "border-violet-500/30 bg-violet-500/5"
                      : "border-white/[0.06] bg-white/[0.04] hover:border-violet-500/20"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setPromptExpanded(promptExpanded === `${entry.step}-${i}` ? null : `${entry.step}-${i}`)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/20 text-violet-300 text-xs font-bold">
                        {i + 1}
                      </span>
                      <span className="font-medium text-white/90 truncate">{entry.label}</span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/40 px-2 py-0.5 rounded bg-white/5">
                        {entry.step}
                      </span>
                    </div>
                    {promptExpanded === `${entry.step}-${i}` ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-white/40" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-white/40" />
                    )}
                  </button>
                  {promptExpanded === `${entry.step}-${i}` && (
                    <div className="px-4 pb-4 pt-0 border-t border-white/[0.06] space-y-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Prompt</p>
                        <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap break-words bg-black/30 rounded-lg p-4 overflow-x-auto max-h-48 overflow-y-auto">
                          {entry.prompt}
                        </pre>
                      </div>
                      {entry.output && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-emerald-400/80 mb-1">Output</p>
                          <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap break-words bg-emerald-950/40 rounded-lg p-4 overflow-x-auto max-h-48 overflow-y-auto border border-emerald-500/20">
                            {entry.output}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {result?.creativeOutput && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Creative direction</p>
            <details className="group rounded-xl bg-white/[0.04] border border-white/[0.06] overflow-hidden" open>
              <summary className="cursor-pointer text-sm font-medium text-white/70 hover:text-white/90 transition-colors px-4 py-3">
                View layout & styling specs
              </summary>
              <div className="px-4 pb-4 pt-0 space-y-3 text-sm text-white/50 border-t border-white/[0.06]">
                <p><strong className="text-white/70">Accent:</strong> {safeRender(result.creativeOutput.accentColor)}</p>
                <div>
                  <strong className="text-white/70">Headline:</strong>{" "}
                  {safeRender(result.creativeOutput.headline.font_family)} {safeRender(result.creativeOutput.headline.font_size)} @ {safeRender(result.creativeOutput.headline.position)}
                  {result.creativeOutput.headline.has_bold && <span> • bold: {safeRender(result.creativeOutput.headline.bold_where || "yes")}</span>}
                  {result.creativeOutput.headline.has_accent && <span> • accent: {safeRender(result.creativeOutput.headline.accent_where || "yes")}</span>}
                </div>
                <div>
                  <strong className="text-white/70">Subheadline:</strong>{" "}
                  {result.creativeOutput.subheadline.visible ? (
                    <>visible • {safeRender(result.creativeOutput.subheadline.font_family)} {safeRender(result.creativeOutput.subheadline.font_size)} @ {safeRender(result.creativeOutput.subheadline.position)}
                      {result.creativeOutput.subheadline.has_bold && <span> • bold: {safeRender(result.creativeOutput.subheadline.bold_where || "yes")}</span>}
                      {result.creativeOutput.subheadline.has_accent && <span> • accent: {safeRender(result.creativeOutput.subheadline.accent_where || "yes")}</span>}
                    </>
                  ) : (
                    "hidden (not used)"
                  )}
                </div>
                <div>
                  <strong className="text-white/70">Product:</strong> {safeRender(result.creativeOutput.product.position)} • zoom: {safeRender(result.creativeOutput.product.zoom)}
                  {result.creativeOutput.product.reversed && <span> • reversed</span>}
                  {result.creativeOutput.product.rotation != null && <span> • rotation: {safeRender(result.creativeOutput.product.rotation)}</span>}
                  {result.creativeOutput.product.focus != null && <span> • focus: {safeRender(result.creativeOutput.product.focus)}</span>}
                  {result.creativeOutput.product.treatment != null && <span> • treatment: {safeRender(result.creativeOutput.product.treatment)}</span>}
                </div>
                <p><strong className="text-white/70">Background:</strong> {safeRender(result.creativeOutput.background)}</p>
                <div>
                  <strong className="text-white/70">CTA:</strong> {safeRender(result.creativeOutput.cta.style)} @ {safeRender(result.creativeOutput.cta.position)}
                  <span> • bg: {result.creativeOutput.cta.has_background ? "yes" : "no"}</span>
                  <span> • chip: {result.creativeOutput.cta.is_chip ? "yes" : "no"}</span>
                </div>
                <div>
                  <strong className="text-white/70">Price:</strong> {safeRender(result.creativeOutput.price.style)} @ {safeRender(result.creativeOutput.price.position)}
                  <span> • bg: {result.creativeOutput.price.has_background ? "yes" : "no"}</span>
                  <span> • chip: {result.creativeOutput.price.is_chip ? "yes" : "no"}</span>
                </div>
                <p><strong className="text-white/70">Effects:</strong> {safeRender(result.creativeOutput.effects)}</p>
              </div>
            </details>
          </div>
        )}

        {isLanding && draftCopyOutput && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Generated copy</p>
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 space-y-2 text-sm">
              <p className="font-semibold text-white">{copyDisplayValue(draftCopyOutput.headline)}</p>
              <p className="text-white/60">{copyDisplayValue(draftCopyOutput.subheadline)}</p>
              <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                <p className="text-xs uppercase text-white/40">Section 3</p>
                <p className="font-medium text-amber-400/90">{copyDisplayValue(draftCopyOutput.section3Headline)}</p>
                <p className="text-white/70 text-sm">{copyDisplayValue(draftCopyOutput.section3Subheadline)}</p>
              </div>
              <p className="text-violet-400 font-medium">{copyDisplayValue(draftCopyOutput.cta)}</p>
              {draftCopyOutput.price != null && String(draftCopyOutput.price).trim() !== "" && (
                <PriceDisplay value={draftCopyOutput.price} displayValue={copyDisplayValue} className="mt-1.5" />
              )}
              {(draftCopyOutput.features == null || draftCopyOutput.features.length === 0) ? (
                <p className="text-white/50 text-sm">Features: (empty)</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-white/70">
                  {draftCopyOutput.features.map((f, i) => {
                    const item = typeof f === "string" ? { text: f } : f;
                    return (
                      <li key={i} className="flex gap-2 items-start">
                        <span className="text-xs text-violet-400/80 italic shrink-0 mt-0.5">•</span>
                        <div className="flex-1">
                          <span className="font-medium">{copyDisplayValue(item.text)}</span>
                          {item.description != null && String(item.description).trim() !== "" && (
                            <p className="text-xs text-white/50 mt-0.5">{copyDisplayValue(item.description)}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {result?.copyOutput && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Copy output</p>
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 space-y-2 text-sm">
              <p className="font-semibold text-white">{copyDisplayValue(result.copyOutput.headline)}</p>
              <p className="text-white/60">{copyDisplayValue(result.copyOutput.subheadline)}</p>
              <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                <p className="text-xs uppercase text-white/40">Section 3</p>
                <p className="font-medium text-amber-400/90">{copyDisplayValue(result.copyOutput.section3Headline)}</p>
                <p className="text-white/70 text-sm">{copyDisplayValue(result.copyOutput.section3Subheadline)}</p>
              </div>
              <p className="text-violet-400 font-medium">{copyDisplayValue(result.copyOutput.cta)}</p>
              {result.copyOutput.price != null && String(result.copyOutput.price).trim() !== "" && (
                <PriceDisplay value={result.copyOutput.price} displayValue={copyDisplayValue} className="mt-1.5" />
              )}
              {(result.copyOutput.features == null || result.copyOutput.features.length === 0) ? (
                <p className="text-white/50 text-sm">Features: (empty)</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-white/70">
                  {result.copyOutput.features.map((f, i) => {
                    const item = typeof f === "string" ? { icon: "check" as const, text: f } : f;
                    return (
                      <li key={i} className="flex gap-2 items-start">
                        {item.visual ? (
                          <span className="text-xs text-violet-400/80 italic shrink-0 mt-0.5">•</span>
                        ) : (
                          <FeatureIcon name={item.icon} />
                        )}
                        <div className="flex-1">
                          <span className="font-medium">{copyDisplayValue(item.text)}</span>
                          {item.visual && (
                            <p className="text-xs text-white/50 mt-0.5 italic">{safeRender(item.visual)}</p>
                          )}
                          {item.description != null && String(item.description).trim() !== "" && (
                            <p className="text-xs text-white/50 mt-0.5">{safeRender(item.description)}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {!promptLog.length && !result?.creativeOutput && !result?.copyOutput && !(isLanding && draftCopyOutput) && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-10 w-10 text-white/20 mb-3" />
            <p className="text-sm text-white/40">Logs will appear here during generation</p>
            <p className="text-xs text-white/30 mt-1">Prompts, creative direction, and more</p>
          </div>
        )}
      </div>
    </aside>
  );
}
