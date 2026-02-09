import stripJsonComments from "strip-json-comments";
import { run } from "../openrouter";
import {
  buildCopyPrompt,
  buildFeaturesPrompt,
  buildFullCreativePrompt,
  buildFullImagePrompt,
  buildImage1Prompt,
  buildSingleCanvaImagePrompt,
  type CopyLanguage,
  type ArabicDialect,
  type SectionCreativeSpec,
  type FeatureItem,
} from "./prompts";

function parseJsonResponse<T>(text: string): T {
  let raw = text.trim();
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) raw = codeBlockMatch[1].trim();
  else {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) raw = raw.slice(start, end + 1);
  }
  return JSON.parse(stripJsonComments(raw)) as T;
}

function extractImageUrl(value: unknown): string | undefined {
  if (typeof value === "string" && (value.startsWith("http") || value.startsWith("data:")))
    return value;
  if (value && typeof value === "object") {
    const u = (value as { url?: string }).url;
    if (typeof u === "string") return u;
  }
  return undefined;
}

// Types
export interface LandingCopyOutput {
  headline: string;
  subheadline: string;
  cta: string;
  price?: string;
  tag?: string;
  badge_text?: string | null;
  shop_info?: string | null;
  features?: FeatureItem[];
  /** Section 3: conversion headline (2–5 words) */
  section3Headline?: string;
  /** Section 3: supporting reassurance or benefit (4–12 words) */
  section3Subheadline?: string;
}

export type { FeatureItem } from "./prompts";

export type { SectionCreativeSpec } from "./prompts";

export interface FullCreativeOutput {
  background_motif?: string;
  section_1: SectionCreativeSpec;
  section_2: SectionCreativeSpec;
  section_3: SectionCreativeSpec;
}

/** Full landing page image aspect ratio */
export const LANDING_FINAL_ASPECT = "2:5" as const;

export interface LandingPipelineState {
  inputImage: string;
  copyOutput?: LandingCopyOutput;
  fullCreative?: FullCreativeOutput;
  /** Section 1 image (SQR - 1:1) */
  imageUrl?: string;
  copyLanguage?: CopyLanguage;
  arabicDialect?: ArabicDialect;
  /** Raw user-provided feature strings (before features agent) */
  features?: string[];
  error?: string;
}

export type { CopyLanguage, ArabicDialect } from "./prompts";

const COPY_MODEL = "google/gemini-2.5-flash" as const;
/** Nano Banana Pro - Gemini 3 Pro Image Preview */
const IMAGE_MODEL = "google/gemini-3-pro-image-preview" as const;

async function copyAgent(state: LandingPipelineState): Promise<Partial<LandingPipelineState>> {
  const language = state.copyLanguage ?? "en";
  const dialect = state.arabicDialect;
  const prompt = buildCopyPrompt(language, dialect);
  const productImage = state.inputImage;
  if (!productImage) throw new Error("Product image required for copy");

  const output = await run(COPY_MODEL, {
    prompt,
    images: [productImage],
    response_mime_type: "application/json",
  });

  const text = Array.isArray(output) ? output.join("") : String(output);
  const raw = parseJsonResponse<{
    section_1?: { headline?: string; subheadline?: string; tag?: string; badge_text?: string | null };
    section_3?: { headline?: string; subheadline?: string; cta?: string; price?: string; shop_info?: string | null };
  }>(text);
  const s1 = raw.section_1 ?? {};
  const s3 = raw.section_3 ?? {};
  const copyOutput: LandingCopyOutput = {
    headline: s1.headline ?? "",
    subheadline: s1.subheadline ?? "",
    tag: s1.tag ?? "",
    badge_text: s1.badge_text ?? null,
    cta: s3.cta ?? "",
    price: s3.price,
    shop_info: s3.shop_info ?? null,
    section3Headline: s3.headline ?? "",
    section3Subheadline: s3.subheadline ?? "",
  };
  if (!copyOutput.headline || !copyOutput.cta) {
    throw new Error("Copy agent failed: headline and CTA required");
  }
  return { copyOutput };
}

async function featuresAgent(state: LandingPipelineState): Promise<Partial<LandingPipelineState>> {
  const language = state.copyLanguage ?? "en";
  const dialect = state.arabicDialect;
  const userFeatures = state.features;
  const prompt = buildFeaturesPrompt(language, dialect, userFeatures);
  const productImage = state.inputImage;
  if (!productImage) throw new Error("Product image required for features");

  const output = await run(COPY_MODEL, {
    prompt,
    images: [productImage],
    response_mime_type: "application/json",
  });

  const text = Array.isArray(output) ? output.join("") : String(output);
  const parsed = parseJsonResponse<{ section_2?: { features?: FeatureItem[] } }>(text);
  const raw = parsed?.section_2?.features;
  const features: FeatureItem[] = Array.isArray(raw)
    ? raw.filter((f): f is FeatureItem => f && typeof f === "object" && typeof (f as FeatureItem).text === "string")
    : [];
  const copyOutput = state.copyOutput ? { ...state.copyOutput, features } : undefined;
  if (!copyOutput) throw new Error("Copy output required for features");
  return { copyOutput };
}

async function creativeAgent(state: LandingPipelineState): Promise<Partial<LandingPipelineState>> {
  const copyOutput = state.copyOutput;
  if (!copyOutput) throw new Error("Copy output required for creative");
  if (!state.inputImage) throw new Error("Product image (inputImage) required for creative");

  const prompt = buildFullCreativePrompt({
    headline: copyOutput.headline ?? "",
    subheadline: copyOutput.subheadline ?? "",
    tag: copyOutput.tag ?? "",
    features: copyOutput.features ?? [],
    section3Headline: copyOutput.section3Headline ?? "",
    section3Subheadline: copyOutput.section3Subheadline ?? "",
    cta: copyOutput.cta ?? "",
    price: copyOutput.price,
  });

  const output = await run(COPY_MODEL, {
    prompt,
    images: [state.inputImage],
    response_mime_type: "application/json",
  });

  const text = Array.isArray(output) ? output.join("") : String(output);
  const fullCreative = parseJsonResponse<FullCreativeOutput>(text);
  if (!fullCreative?.section_1?.accentColor || !fullCreative?.section_2?.accentColor || !fullCreative?.section_3?.accentColor) {
    throw new Error("Creative agent failed: all three sections required");
  }
  
  // Enforce correct panel sizes: Section 1 = SQR, Sections 2 & 3 = WIDE
  if (fullCreative.section_1) {
    fullCreative.section_1.panel_size = "SQR";
  }
  if (fullCreative.section_2) {
    fullCreative.section_2.panel_size = "WIDE";
  }
  if (fullCreative.section_3) {
    fullCreative.section_3.panel_size = "WIDE";
  }
  
  return { fullCreative };
}

async function imageGeneratorForFullImage(state: LandingPipelineState): Promise<Partial<LandingPipelineState>> {
  const fullCreative = state.fullCreative;
  if (!state.inputImage || !fullCreative?.section_1 || !fullCreative?.section_2 || !fullCreative?.section_3) {
    throw new Error("Missing input for full image: need inputImage and fullCreative");
  }

  // Target dimensions: width 700px, height minimum 1632px
  const targetWidth = 700;
  const targetHeight = 1632; // minimum height

  // Generate single Canva image with all three sections combined
  const prompt = buildSingleCanvaImagePrompt(
    fullCreative.section_1,
    fullCreative.section_2,
    fullCreative.section_3,
    fullCreative.background_motif,
    targetWidth,
    targetHeight
  );
  
  const output = await run(IMAGE_MODEL, {
    prompt,
    images: [state.inputImage],
    modalities: ["image", "text"],
  });

  const imageUrl = extractImageUrl(output) ?? (typeof output === "string" ? output : undefined);
  if (!imageUrl) throw new Error("Image generator did not return the Canva image");

  // Return single image URL containing all three sections
  return { 
    imageUrl: imageUrl, // Single Canva image with all three sections
  };
}

export type LandingPipelineStage =
  | "copy"
  | "features"
  | "creative"
  | "image";

function parseProductFeatures(raw: string | undefined): string[] | undefined {
  if (!raw?.trim()) return undefined;
  const lines = raw
    .split(/[\n,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : undefined;
}

export interface PromptStep {
  step: LandingPipelineStage;
  label: string;
  prompt: string;
}

async function runPipeline(
  inputImage: string,
  options?: {
    price?: string;
    copyLanguage?: CopyLanguage;
    arabicDialect?: ArabicDialect;
    productFeatures?: string;
  },
  onProgress?: (stage: LandingPipelineStage, partial?: Partial<LandingPipelineState> & { prompt?: string; promptLabel?: string; output?: string }) => void
): Promise<LandingPipelineState> {
  const userFeatures = parseProductFeatures(options?.productFeatures);

  let state: LandingPipelineState = {
    inputImage,
    copyLanguage: options?.copyLanguage ?? "en",
    arabicDialect: options?.arabicDialect,
    features: userFeatures,
  };

  const lang = state.copyLanguage ?? "en";
  const dialect = state.arabicDialect;

  onProgress?.("copy", {
    prompt: buildCopyPrompt(lang, dialect),
    promptLabel: "Copy (headline, CTA, tag)",
  });
  state = { ...state, ...(await copyAgent(state)) };
  onProgress?.("copy", { output: JSON.stringify(state.copyOutput, null, 2) });

  onProgress?.("features", {
    prompt: buildFeaturesPrompt(lang, dialect, state.features),
    promptLabel: "Product features",
  });
  state = { ...state, ...(await featuresAgent(state)) };
  onProgress?.("features", { output: JSON.stringify(state.copyOutput?.features ?? [], null, 2) });

  if (options?.price && state.copyOutput) {
    state.copyOutput = { ...state.copyOutput, price: options.price };
  }

  const copy = state.copyOutput;
  onProgress?.("creative", {
    prompt: buildFullCreativePrompt({
      headline: copy?.headline ?? "",
      subheadline: copy?.subheadline ?? "",
      tag: copy?.tag ?? "",
      features: copy?.features ?? [],
      section3Headline: copy?.section3Headline ?? "",
      section3Subheadline: copy?.section3Subheadline ?? "",
      cta: copy?.cta ?? "",
      price: copy?.price,
    }),
    promptLabel: "Creative direction (layout, styling)",
  });
  state = { ...state, ...(await creativeAgent(state)) };
  onProgress?.("creative", { output: JSON.stringify(state.fullCreative, null, 2) });

  const fc = state.fullCreative;
  if (fc) {
    onProgress?.("image", {
      prompt: buildSingleCanvaImagePrompt(fc.section_1, fc.section_2, fc.section_3, fc.background_motif, 700, 1632),
      promptLabel: "Single Canva image (all three sections)",
    });
  }
  const imageResult = await imageGeneratorForFullImage(state);
  state = { ...state, ...imageResult };
  if (fc && imageResult.imageUrl) {
    onProgress?.("image", {
      prompt: buildSingleCanvaImagePrompt(fc.section_1, fc.section_2, fc.section_3, fc.background_motif, 700, 1632),
      promptLabel: "Single Canva image (all three sections)",
      output: `Canva image (700x1632px): ${imageResult.imageUrl}`,
    });
  }

  return state;
}

export async function runLandingPipeline(
  inputImage: string,
  options?: {
    price?: string;
    copyLanguage?: CopyLanguage;
    arabicDialect?: ArabicDialect;
    productFeatures?: string;
  }
) {
  return runPipeline(inputImage, options);
}

export async function runLandingPipelineWithProgress(
  inputImage: string,
  onProgress: (stage: LandingPipelineStage, partial?: Partial<LandingPipelineState>) => void,
  options?: {
    price?: string;
    copyLanguage?: CopyLanguage;
    arabicDialect?: ArabicDialect;
    productFeatures?: string;
  }
) {
  return runPipeline(inputImage, options, onProgress);
}

/** Resume from image step using existing copyOutput. Skips copy/features, runs creative + image. */
export async function runLandingPipelineResume(
  partialState: Pick<LandingPipelineState, "inputImage" | "copyOutput"> & {
    price?: string;
    copyLanguage?: CopyLanguage;
    arabicDialect?: ArabicDialect;
  },
  onProgress?: (stage: LandingPipelineStage, partial?: Partial<LandingPipelineState> & { prompt?: string; promptLabel?: string; output?: string }) => void
): Promise<LandingPipelineState> {
  const { inputImage, copyOutput } = partialState;
  if (!inputImage || !copyOutput) throw new Error("Resume requires inputImage, copyOutput");

  let state: LandingPipelineState = {
    inputImage,
    copyOutput,
    copyLanguage: partialState.copyLanguage ?? "en",
    arabicDialect: partialState.arabicDialect,
  };
  if (partialState.price && state.copyOutput) {
    state.copyOutput = { ...state.copyOutput, price: partialState.price };
  }

  const copy = state.copyOutput;
  onProgress?.("creative", {
    prompt: copy
      ? buildFullCreativePrompt({
          headline: copy.headline ?? "",
          subheadline: copy.subheadline ?? "",
          tag: copy.tag ?? "",
          features: copy.features ?? [],
          section3Headline: copy.section3Headline ?? "",
          section3Subheadline: copy.section3Subheadline ?? "",
          cta: copy.cta ?? "",
          price: copy.price,
        })
      : "",
    promptLabel: "Creative direction (layout, styling)",
  });
  state = { ...state, ...(await creativeAgent(state)) };
  onProgress?.("creative", { output: JSON.stringify(state.fullCreative, null, 2) });

  const fc = state.fullCreative;
  if (fc) {
    onProgress?.("image", {
      prompt: buildSingleCanvaImagePrompt(fc.section_1, fc.section_2, fc.section_3, fc.background_motif, 700, 1632),
      promptLabel: "Single Canva image (all three sections)",
    });
  }
  const imageResult = await imageGeneratorForFullImage(state);
  state = { ...state, ...imageResult };
  if (fc && imageResult.imageUrl) {
    onProgress?.("image", {
      prompt: buildSingleCanvaImagePrompt(fc.section_1, fc.section_2, fc.section_3, fc.background_motif, 700, 1632),
      promptLabel: "Single Canva image (all three sections)",
      output: `Canva image (700x1632px): ${imageResult.imageUrl}`,
    });
  }

  return state;
}
