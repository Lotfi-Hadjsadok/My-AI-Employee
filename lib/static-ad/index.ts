import { run } from "../openrouter";
import {
  parseJsonResponse,
  extractImageUrl,
  parseProductFeatures,
  COPY_MODEL,
  IMAGE_MODEL,
} from "../pipeline-common";
import {
  buildCopyPrompt,
  buildFeaturesPrompt,
  buildPriceCopyPrompt,
  buildCreativeAgentPrompt,
  IMAGE_GENERATOR_PROMPT_PREFIX,
  type CopyLanguage,
  type ArabicDialect,
} from "./prompts";

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

async function copyAgent(state: AdPipelineState): Promise<Partial<AdPipelineState>> {
  const language = state.copyLanguage ?? "en";
  const dialect = state.arabicDialect;
  const prompt = buildCopyPrompt(language, dialect);
  const productImage = state.inputImage;
  if (!productImage) throw new Error("Product image is required for copy generation");

  const runOnce = async (): Promise<Partial<AdPipelineState>> => {
    const output = await run(COPY_MODEL, {
      prompt,
      images: [productImage],
      response_mime_type: "application/json",
    });
    const text = Array.isArray(output) ? output.join("") : String(output);
    const copyOutput = parseJsonResponse<CopyOutput>(text);
    if (!copyOutput.headline || !copyOutput.cta) {
      throw new Error("Copy agent failed to produce valid output with headline and CTA");
    }
    return { copyOutput };
  };
  try {
    return await runOnce();
  } catch (err) {
    const isJsonError =
      err instanceof SyntaxError ||
      (err &&
        typeof (err as Error).message === "string" &&
        ((err as Error).message.includes("JSON") || (err as Error).message.includes("position")));
    if (isJsonError) return await runOnce();
    throw err;
  }
}

async function featuresAgent(state: AdPipelineState): Promise<Partial<AdPipelineState>> {
  const language = state.copyLanguage ?? "en";
  const dialect = state.arabicDialect;
  const userFeatures = state.features;
  const prompt = buildFeaturesPrompt(language, dialect, userFeatures);
  const productImage = state.inputImage;
  if (!productImage) throw new Error("Product image is required for features");

  const runOnce = async (): Promise<Partial<AdPipelineState>> => {
    const output = await run(COPY_MODEL, {
      prompt,
      images: [productImage],
      response_mime_type: "application/json",
    });
    const text = Array.isArray(output) ? output.join("") : String(output);
    const parsed = parseJsonResponse<{ features?: string[] }>(text);
    const features = Array.isArray(parsed?.features) ? parsed.features : [];
    const copyOutput = state.copyOutput ? { ...state.copyOutput, features } : undefined;
    return copyOutput ? { copyOutput } : { features };
  };
  try {
    return await runOnce();
  } catch (err) {
    const isJsonError =
      err instanceof SyntaxError ||
      (err &&
        typeof (err as Error).message === "string" &&
        ((err as Error).message.includes("JSON") || (err as Error).message.includes("position")));
    if (isJsonError) return await runOnce();
    throw err;
  }
}

/** price_agent: takes raw price lines (user-provided or extracted) and rewrites them into persuasive, language-correct price copy. */
async function priceAgent(state: AdPipelineState): Promise<Partial<AdPipelineState>> {
  const language = state.copyLanguage ?? "en";
  const dialect = state.arabicDialect;

  // Prefer explicit user price from state, otherwise fall back to copy output price.
  const raw = (state.price ?? state.copyOutput?.price ?? "").trim();
  if (!raw) return {};

  const lines = raw.split("\n").map((s) => s.trim()).filter(Boolean);
  // If only a single price line, just normalize it into copyOutput and keep as-is.
  if (lines.length <= 1) {
    const single = lines[0] ?? raw;
    const copyOutput = state.copyOutput ? { ...state.copyOutput, price: single } : undefined;
    return copyOutput ? { copyOutput, price: single } : { price: single };
  }

  const prompt = buildPriceCopyPrompt(language, dialect, raw);

  const runOnce = async (): Promise<Partial<AdPipelineState>> => {
    const output = await run(COPY_MODEL, {
      prompt,
      response_mime_type: "application/json",
    });
    const text = Array.isArray(output) ? output.join("") : String(output);
    const parsed = parseJsonResponse<{ price?: string }>(text);
    const formatted = (parsed.price ?? "").trim();
    if (!formatted) return {};
    const copyOutput = state.copyOutput ? { ...state.copyOutput, price: formatted } : undefined;
    return copyOutput ? { copyOutput, price: formatted } : { price: formatted };
  };

  try {
    return await runOnce();
  } catch (err) {
    const isJsonError =
      err instanceof SyntaxError ||
      (err &&
        typeof (err as Error).message === "string" &&
        ((err as Error).message.includes("JSON") || (err as Error).message.includes("position")));
    if (isJsonError) return await runOnce();
    throw err;
  }
}

async function creativeAgent(state: AdPipelineState): Promise<Partial<AdPipelineState>> {
  const inputImage = state.inputImage;
  if (!inputImage) throw new Error("Product image is required for creative");

  const runOnce = async (): Promise<Partial<AdPipelineState>> => {
    const creativePrompt = buildCreativeAgentPrompt(state.copyOutput);
    const output = await run(COPY_MODEL, {
      prompt: creativePrompt,
      images: [inputImage],
      response_mime_type: "application/json",
    });
    const text = Array.isArray(output) ? output.join("") : String(output);
    const creativeOutput = parseJsonResponse<CreativeOutput>(text);
    if (!creativeOutput.accentColor || !creativeOutput.background || !creativeOutput.effects) {
      throw new Error("Creative agent failed to produce valid output (accentColor, background, effects required)");
    }
    return { creativeOutput };
  };
  try {
    return await runOnce();
  } catch (err) {
    const isJsonError =
      err instanceof SyntaxError ||
      (err &&
        typeof (err as Error).message === "string" &&
        ((err as Error).message.includes("JSON") || (err as Error).message.includes("position")));
    if (isJsonError) return await runOnce();
    throw err;
  }
}

function buildImageGeneratorPrompt(payload: AdCreativePayload, aspectRatio: AspectRatio): string {
  return `${IMAGE_GENERATOR_PROMPT_PREFIX}\n\n${JSON.stringify(payload, null, 2)}`;
}

async function imageGeneratorAgent(state: AdPipelineState): Promise<Partial<AdPipelineState>> {
  const { copyOutput, creativeOutput, inputImage, price: userPrice, aspectRatio = "1:1" } = state;

  if (!inputImage || !copyOutput || !creativeOutput) {
    throw new Error("Input image, copy output, and creative output required for image generation");
  }

  const adCopy = { ...copyOutput, price: userPrice ?? copyOutput.price ?? undefined };
  const payload: AdCreativePayload = { ad_copy: adCopy, ad_creative: creativeOutput };
  const fullPrompt = buildImageGeneratorPrompt(payload, aspectRatio);

  const output = await run(IMAGE_MODEL, {
    prompt: fullPrompt,
    images: [inputImage],
    modalities: ["image", "text"],
  });

  const raw = Array.isArray(output) ? output[0] : output;
  const imageUrl = extractImageUrl(raw) ?? (typeof raw === "string" ? raw : undefined);
  if (!imageUrl) throw new Error("Image generator did not return an image");
  return { generatedImageUrl: imageUrl };
}

export type PipelineStage = "copy" | "creative" | "generating";

export interface PipelineProgressDetail {
  promptLabel?: string;
  prompt?: string;
  output?: string;
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
  onProgress?: (stage: PipelineStage, detail?: PipelineProgressDetail) => void
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

  const emit = (stage: PipelineStage, detail?: PipelineProgressDetail) => onProgress?.(stage, detail);

  const lang = state.copyLanguage ?? "en";
  const dialect = state.arabicDialect;

  emit("copy", {
    promptLabel: "Pipeline started",
    output: `Aspect ${state.aspectRatio}, language ${state.copyLanguage}`,
  });

  // Copy agent
  emit("copy", {
    promptLabel: "Copy agent",
    prompt: buildCopyPrompt(lang, dialect),
  });
  state = { ...state, ...(await copyAgent(state)) };
  emit("copy", {
    promptLabel: "Copy agent",
    output: state.copyOutput ? JSON.stringify(state.copyOutput, null, 2) : "",
  });

  // Features agent
  emit("copy", {
    promptLabel: "Features agent",
    prompt: buildFeaturesPrompt(lang, dialect, state.features),
  });
  state = { ...state, ...(await featuresAgent(state)) };
  emit("copy", {
    promptLabel: "Features agent",
    output: JSON.stringify(state.copyOutput?.features ?? state.features ?? [], null, 2),
  });

  // price_agent: format user-provided price (or extracted price) into final price copy before creative.
  if ((state.price ?? state.copyOutput?.price)?.trim()) {
    const rawPrice = (state.price ?? state.copyOutput?.price ?? "").trim();
    emit("copy", {
      promptLabel: "Price agent",
      prompt: buildPriceCopyPrompt(lang, dialect, rawPrice),
    });
    state = { ...state, ...(await priceAgent(state)) };
    emit("copy", {
      promptLabel: "Price agent",
      output: state.copyOutput?.price ?? state.price ?? "",
    });
  }

  // Creative agent
  emit("creative", {
    promptLabel: "Creative agent",
    prompt: buildCreativeAgentPrompt(state.copyOutput),
  });
  state = { ...state, ...(await creativeAgent(state)) };
  emit("creative", {
    promptLabel: "Creative agent",
    output: state.creativeOutput ? JSON.stringify(state.creativeOutput, null, 2) : "",
  });

  // Image generator
  if (state.copyOutput && state.creativeOutput) {
    const adCopy = {
      ...state.copyOutput,
      price: state.price ?? state.copyOutput.price ?? undefined,
    };
    const payload: AdCreativePayload = {
      ad_copy: adCopy,
      ad_creative: state.creativeOutput,
    };
    emit("generating", {
      promptLabel: "Image generator",
      prompt: buildImageGeneratorPrompt(payload, state.aspectRatio ?? "1:1"),
    });
  } else {
    emit("generating", { promptLabel: "Image generator", output: "Running…" });
  }
  state = { ...state, ...(await imageGeneratorAgent(state)) };
  emit("generating", {
    promptLabel: "Image generator",
    output: state.generatedImageUrl ?? "",
  });

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
  onProgress: (stage: PipelineStage, detail?: PipelineProgressDetail) => void,
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

/** Run only copy + features; returns state with copyOutput for user to edit. */
export async function runCopyOnly(
  inputImage: string,
  options?: {
    price?: string;
    copyLanguage?: CopyLanguage;
    arabicDialect?: ArabicDialect;
    productFeatures?: string;
  },
  onProgress?: (stage: PipelineStage, detail?: PipelineProgressDetail) => void
): Promise<AdPipelineState> {
  const userFeatures = parseProductFeatures(options?.productFeatures);
  let state: AdPipelineState = {
    inputImage,
    price: options?.price,
    aspectRatio: "1:1",
    copyLanguage: options?.copyLanguage ?? "en",
    arabicDialect: options?.arabicDialect,
    features: userFeatures,
  };
  const emit = (stage: PipelineStage, detail?: PipelineProgressDetail) => onProgress?.(stage, detail);

  const lang = state.copyLanguage ?? "en";
  const dialect = state.arabicDialect;

  // Copy agent
  emit("copy", {
    promptLabel: "Copy agent",
    prompt: buildCopyPrompt(lang, dialect),
  });
  state = { ...state, ...(await copyAgent(state)) };
  emit("copy", {
    promptLabel: "Copy agent",
    output: state.copyOutput ? JSON.stringify(state.copyOutput, null, 2) : "",
  });

  // Features agent
  emit("copy", {
    promptLabel: "Features agent",
    prompt: buildFeaturesPrompt(lang, dialect, state.features),
  });
  state = { ...state, ...(await featuresAgent(state)) };
  emit("copy", {
    promptLabel: "Features agent",
    output: JSON.stringify(state.copyOutput?.features ?? state.features ?? [], null, 2),
  });
  if ((state.price ?? state.copyOutput?.price)?.trim()) {
    const rawPrice = (state.price ?? state.copyOutput?.price ?? "").trim();
    emit("copy", {
      promptLabel: "Price agent",
      prompt: buildPriceCopyPrompt(lang, dialect, rawPrice),
    });
    state = { ...state, ...(await priceAgent(state)) };
    emit("copy", {
      promptLabel: "Price agent",
      output: state.copyOutput?.price ?? state.price ?? "",
    });
  }
  return state;
}

/** Run creative + image only, using provided copyOutput (e.g. after user edit). */
export async function runCreativeAndImageWithProgress(
  inputImage: string,
  copyOutput: CopyOutput,
  onProgress: (stage: PipelineStage, detail?: PipelineProgressDetail) => void,
  options?: {
    price?: string;
    aspectRatio?: AspectRatio;
  }
): Promise<AdPipelineState> {
  const state: AdPipelineState = {
    inputImage,
    copyOutput,
    price: options?.price ?? copyOutput.price,
    aspectRatio: options?.aspectRatio ?? "1:1",
  };
  const emit = (stage: PipelineStage, detail?: PipelineProgressDetail) => onProgress(stage, detail);

  // Creative agent
  emit("creative", {
    promptLabel: "Creative agent",
    prompt: buildCreativeAgentPrompt(state.copyOutput),
  });
  const withCreative = { ...state, ...(await creativeAgent(state)) };
  emit("creative", {
    promptLabel: "Creative agent",
    output: withCreative.creativeOutput ? JSON.stringify(withCreative.creativeOutput, null, 2) : "",
  });

  // Image generator
  if (withCreative.copyOutput && withCreative.creativeOutput) {
    const adCopy = {
      ...withCreative.copyOutput,
      price: withCreative.price ?? withCreative.copyOutput.price ?? undefined,
    };
    const payload: AdCreativePayload = {
      ad_copy: adCopy,
      ad_creative: withCreative.creativeOutput,
    };
    emit("generating", {
      promptLabel: "Image generator",
      prompt: buildImageGeneratorPrompt(payload, withCreative.aspectRatio ?? "1:1"),
    });
  } else {
    emit("generating", { promptLabel: "Image generator", output: "Running…" });
  }
  const final = { ...withCreative, ...(await imageGeneratorAgent(withCreative)) };
  emit("generating", {
    promptLabel: "Image generator",
    output: final.generatedImageUrl ?? "",
  });
  return { ...final, refinedImageUrl: final.generatedImageUrl ?? final.inputImage };
}
