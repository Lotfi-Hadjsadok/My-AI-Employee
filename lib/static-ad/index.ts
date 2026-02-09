import stripJsonComments from "strip-json-comments";
import { runWithRetry, RATE_LIMIT_DELAY_MS } from "../replicate";
import {
  buildCopyPrompt,
  buildFeaturesPrompt,
  buildCreativeAgentPrompt,
  type CopyLanguage,
  type ArabicDialect,
} from "./prompts";
import { IMAGE_GENERATOR_PROMPT_PREFIX } from "./prompts";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Strip markdown code blocks (```json ... ``` or ``` ... ```) then parse JSON */
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
export interface CopyOutput {
  headline: string;
  badge_text?: string | null;
  subheadline: string;
  cta: string;
  price?: string;
  additional_text?: Array<{ label: string; content: string }> | null;
  features?: string[];
}

export interface TypographySpec {
  font_family: string;
  font_size: string;
  position: string;
  has_bold: boolean;
  bold_where?: string;
  has_accent: boolean;
  accent_where?: string;
}

export interface SubheadlineSpec extends TypographySpec {
  visible: boolean;
}

export interface CtaSpec {
  has_background: boolean;
  is_chip: boolean;
  position: string;
  style: string;
}

export interface PriceSpec {
  has_background: boolean;
  is_chip: boolean;
  position: string;
  style: string;
}

export interface ProductSpec {
  reversed?: boolean;
  position: string;
  zoom: string;
  rotation?: string;
  focus?: string;
  treatment?: string;
}

export interface FeaturesSpec {
  visible: boolean;
  position: string;
  font_family: string;
  font_size: string;
  layout: string;
  style: string;
}

export interface ContinuityDirective {
  element_type: "texture_overlay" | "geometric_motif" | "pattern";
  placement_hint: string;
  panel_variations?: Record<string, string> | null;
  color_instruction: string;
  visual_description: string;
}

export interface GlobalDirective {
  vibe?: string;
  color_palette?: {
    cta_hex?: string;
    accent_hex?: string;
    background_hex?: string;
    primary_text_hex?: string;
  };
  typography_guide?: string;
  continuity_directives?: ContinuityDirective[];
  transition_directives?: unknown[];
  recurring_visual_elements?: string[];
  panel_indicator_description?: string;
}

export interface TextContent {
  headline: string;
  badge_text?: string | null;
  price_text?: string | null;
  sub_headline?: string | null;
  additional_text?: Array<{ label: string; content: string; style_hint?: string | null }> | null;
  cta_button_text?: string | null;
  text_styling_instructions?: string;
}

export interface CreativeOutput {
  accentColor: string;
  global_directive?: GlobalDirective;
  text_content?: TextContent;
  headline: TypographySpec;
  subheadline: SubheadlineSpec;
  product: ProductSpec;
  composition_notes?: string;
  visual_prompt_english?: string;
  requires_product_reference?: boolean;
  background: string;
  cta: CtaSpec;
  price: PriceSpec;
  effects: string;
  features?: FeaturesSpec;
}

export interface AdCreativePayload {
  ad_copy: CopyOutput;
  ad_creative: CreativeOutput;
}

export type AspectRatio = "1:1" | "4:5" | "9:16" | "16:9";

export interface AdPipelineState {
  inputImage: string;
  copyOutput?: CopyOutput;
  creativeOutput?: CreativeOutput;
  price?: string;
  aspectRatio?: AspectRatio;
  copyLanguage?: CopyLanguage;
  arabicDialect?: ArabicDialect;
  features?: string[];
  generatedImageUrl?: string;
  refinedImageUrl?: string;
  error?: string;
}

export type { CopyLanguage, ArabicDialect } from "./prompts";

const COPY_MODEL = "google/gemini-2.5-flash" as const;

async function copyAgent(state: AdPipelineState): Promise<Partial<AdPipelineState>> {
  const language = state.copyLanguage ?? "en";
  const dialect = state.arabicDialect;
  const prompt = buildCopyPrompt(language, dialect);
  const productImage = state.inputImage;
  if (!productImage) throw new Error("Product image is required for copy generation");

  const output = await runWithRetry(COPY_MODEL, {
    input: {
      prompt,
      images: [productImage],
      response_mime_type: "application/json",
    },
  });

  const text = Array.isArray(output) ? output.join("") : String(output);
  const copyOutput = parseJsonResponse<CopyOutput>(text);
  if (!copyOutput.headline || !copyOutput.cta) {
    throw new Error("Copy agent failed to produce valid output with headline and CTA");
  }
  return { copyOutput };
}

async function featuresAgent(state: AdPipelineState): Promise<Partial<AdPipelineState>> {
  await sleep(RATE_LIMIT_DELAY_MS);
  const language = state.copyLanguage ?? "en";
  const dialect = state.arabicDialect;
  const userFeatures = state.features;
  const prompt = buildFeaturesPrompt(language, dialect, userFeatures);
  const productImage = state.inputImage;
  if (!productImage) throw new Error("Product image is required for features");

  const output = await runWithRetry(COPY_MODEL, {
    input: {
      prompt,
      images: [productImage],
      response_mime_type: "application/json",
    },
  });

  const text = Array.isArray(output) ? output.join("") : String(output);
  const parsed = parseJsonResponse<{ features?: string[] }>(text);
  const features = Array.isArray(parsed?.features) ? parsed.features : [];
  const copyOutput = state.copyOutput ? { ...state.copyOutput, features } : undefined;
  return copyOutput ? { copyOutput } : { features };
}

async function creativeAgent(state: AdPipelineState): Promise<Partial<AdPipelineState>> {
  await sleep(RATE_LIMIT_DELAY_MS);
  const creativePrompt = buildCreativeAgentPrompt(state.copyOutput);
  const output = await runWithRetry("openai/gpt-4.1-nano", {
    input: {
      image_input: [state.inputImage],
      prompt: creativePrompt,
      // max_completion_tokens: 800,
      response_format: { type: "json_object" },
    },
  });

  const text = Array.isArray(output) ? output.join("") : String(output);
  const creativeOutput = parseJsonResponse<CreativeOutput>(text);
  if (!creativeOutput.accentColor || !creativeOutput.background || !creativeOutput.effects) {
    throw new Error("Creative agent failed to produce valid output (accentColor, background, effects required)");
  }
  return { creativeOutput };
}

function buildImageGeneratorPrompt(payload: AdCreativePayload, aspectRatio: AspectRatio): string {
  return `${IMAGE_GENERATOR_PROMPT_PREFIX}\n\n${JSON.stringify(payload, null, 2)}`;
}

async function imageGeneratorAgent(state: AdPipelineState): Promise<Partial<AdPipelineState>> {
  await sleep(RATE_LIMIT_DELAY_MS);
  const { copyOutput, creativeOutput, inputImage, price: userPrice, aspectRatio = "1:1" } = state;

  if (!inputImage || !copyOutput || !creativeOutput) {
    throw new Error("Input image, copy output, and creative output required for image generation");
  }

  const adCopy = { ...copyOutput, price: userPrice ?? copyOutput.price ?? undefined };
  const payload: AdCreativePayload = { ad_copy: adCopy, ad_creative: creativeOutput };
  const fullPrompt = buildImageGeneratorPrompt(payload, aspectRatio);

  const output = await runWithRetry("google/nano-banana-pro", {
    input: { prompt: fullPrompt, aspect_ratio: aspectRatio, image_input: [inputImage] },
  });

  const raw = Array.isArray(output) ? output[0] : output;
  const imageUrl = extractImageUrl(raw) ?? (typeof raw === "string" ? raw : undefined);
  if (!imageUrl) throw new Error("Image generator did not return an image");
  return { generatedImageUrl: imageUrl };
}

export type PipelineStage = "copy" | "creative" | "generating";

function parseProductFeatures(raw: string | undefined): string[] | undefined {
  if (!raw?.trim()) return undefined;
  const lines = raw
    .split(/[\n,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : undefined;
}

async function runPipeline(
  inputImage: string,
  options?: {
    price?: string;
    aspectRatio?: AspectRatio;
    copyLanguage?: CopyLanguage;
    arabicDialect?: ArabicDialect;
    productFeatures?: string;
  },
  onProgress?: (stage: PipelineStage) => void
): Promise<AdPipelineState> {
  const userFeatures = parseProductFeatures(options?.productFeatures);

  let state: AdPipelineState = {
    inputImage,
    price: options?.price,
    aspectRatio: options?.aspectRatio ?? "1:1",
    copyLanguage: options?.copyLanguage ?? "en",
    arabicDialect: options?.arabicDialect,
    features: userFeatures,
  };

  onProgress?.("copy");

  state = { ...state, ...(await copyAgent(state)) };

  state = { ...state, ...(await featuresAgent(state)) };

  onProgress?.("creative");
  state = { ...state, ...(await creativeAgent(state)) };

  onProgress?.("generating");
  state = { ...state, ...(await imageGeneratorAgent(state)) };

  state = { ...state, refinedImageUrl: state.generatedImageUrl ?? state.inputImage };

  return state;
}

export async function runAdPipeline(
  inputImage: string,
  options?: {
    price?: string;
    aspectRatio?: AspectRatio;
    copyLanguage?: CopyLanguage;
    arabicDialect?: ArabicDialect;
    productFeatures?: string;
  }
) {
  return runPipeline(inputImage, options);
}

export async function runAdPipelineWithProgress(
  inputImage: string,
  onProgress: (stage: PipelineStage) => void,
  options?: {
    price?: string;
    aspectRatio?: AspectRatio;
    copyLanguage?: CopyLanguage;
    arabicDialect?: ArabicDialect;
    productFeatures?: string;
  }
) {
  return runPipeline(inputImage, options, onProgress);
}
