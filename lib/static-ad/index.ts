import { run } from "../openrouter";
import { COPY_MODEL, IMAGE_MODEL } from "../pipeline-common";
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
  currency?: string;
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
    const copyOutput = JSON.parse((Array.isArray(output) ? output.join("") : String(output ?? "")).trim()) as CopyOutput;
    if (!copyOutput.headline || !copyOutput.cta) {
      throw new Error("Copy agent failed to produce valid output with headline and CTA");
    }
    return { copyOutput };
  };
  return runOnce();
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
    const parsed = JSON.parse((Array.isArray(output) ? output.join("") : String(output ?? "")).trim()) as { features?: string[] };
    const features = Array.isArray(parsed?.features) ? parsed.features : [];
    const copyOutput = state.copyOutput ? { ...state.copyOutput, features } : undefined;
    return copyOutput ? { copyOutput } : { features };
  };
  return runOnce();
}

/** Ensure a single price line has currency next to it (e.g. 3900 → 3900 DZD). Strips trailing currency first to avoid duplication. */
function appendCurrencyToLine(line: string, currency: string, copyLanguage?: string): string {
  const label = currency === "DZD" && copyLanguage === "ar" ? "دج" : currency;
  const stripRe = new RegExp(`\\s*(?:${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|DZD|دج|\\$|€|USD|EUR)\\s*$`, "i");
  const cleaned = line.trim().replace(stripRe, "").trim();
  return cleaned ? `${cleaned} ${label}` : line;
}

/** price_agent: rewrites raw price lines into persuasive ad copy. Every returned price has its currency next to it. */
async function priceAgent(state: AdPipelineState): Promise<Partial<AdPipelineState>> {
  const language = state.copyLanguage ?? "en";
  const dialect = state.arabicDialect;
  const currency =
    state.copyOutput?.currency ?? state.currency ?? (language === "ar" && dialect === "algerian" ? "DZD" : undefined);
  const raw = (state.price ?? state.copyOutput?.price ?? "").trim();
  if (!raw) return {};

  const lines = raw.split("\n").map((s) => s.trim()).filter(Boolean);
  if (lines.length <= 1) {
    const single = lines[0] ?? raw;
    const withCurrency = currency ? appendCurrencyToLine(single, currency, language) : single;
    const copyOutput = state.copyOutput ? { ...state.copyOutput, price: withCurrency } : undefined;
    return copyOutput ? { copyOutput, price: withCurrency } : { price: withCurrency };
  }

  const prompt = buildPriceCopyPrompt(language, dialect, raw, currency);
  const output = await run(COPY_MODEL, { prompt, response_mime_type: "application/json" });
  const parsed = JSON.parse((Array.isArray(output) ? output.join("") : String(output ?? "")).trim()) as { price?: string };
  let formatted = (parsed.price ?? "").trim();
  if (!formatted) return {};
  if (currency) {
    formatted = formatted.split("\n").map((l) => appendCurrencyToLine(l, currency, language)).join("\n");
  }
  const copyOutput = state.copyOutput ? { ...state.copyOutput, price: formatted } : undefined;
  return copyOutput ? { copyOutput, price: formatted } : { price: formatted };
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
    const creativeOutput = JSON.parse((Array.isArray(output) ? output.join("") : String(output ?? "")).trim()) as CreativeOutput;
    if (!creativeOutput.accentColor || !creativeOutput.background || !creativeOutput.effects) {
      throw new Error("Creative agent failed to produce valid output (accentColor, background, effects required)");
    }
    return { creativeOutput };
  };
  return runOnce();
}

function buildImageGeneratorPrompt(payload: AdCreativePayload, aspectRatio: AspectRatio): string {
  const ratioLabel =
    aspectRatio === "1:1"
      ? "1:1 square (feed)"
      : aspectRatio === "4:5"
        ? "4:5 portrait (Instagram feed)"
        : aspectRatio === "9:16"
          ? "9:16 vertical (stories/reels)"
          : aspectRatio === "16:9"
            ? "16:9 horizontal (landscape)"
            : aspectRatio;

  const ratioInstruction = `Aspect ratio: ${ratioLabel}. Fill the ENTIRE canvas with the ad design in this exact ratio. FORBIDDEN: letterboxing, padding bars, or any trick that changes the effective ratio.`;

  const prefix = `${IMAGE_GENERATOR_PROMPT_PREFIX} ${ratioInstruction}`;

  const payloadWithMeta = {
    ...payload,
    meta: {
      ...(payload as unknown as { meta?: Record<string, unknown> }).meta,
      aspect_ratio: aspectRatio,
    },
  };

  return `${prefix}\n\n${JSON.stringify(payloadWithMeta, null, 2)}`;
}

async function imageGeneratorAgent(state: AdPipelineState): Promise<Partial<AdPipelineState>> {
  const { copyOutput, creativeOutput, inputImage, price: userPrice, aspectRatio = "1:1" } = state;

  if (!inputImage || !copyOutput || !creativeOutput) {
    throw new Error("Input image, copy output, and creative output required for image generation");
  }

  const adCopy = { ...copyOutput, price: userPrice ?? copyOutput.price ?? undefined };
  const priceText = adCopy.price?.trim();
  // Ensure the image generator always receives the exact price so the static ad shows the pricing model
  const adCreativeWithPrice: CreativeOutput =
    priceText
      ? {
          ...creativeOutput,
          text_content: {
            ...creativeOutput.text_content,
            price_text: priceText,
          },
        }
      : creativeOutput;

  const payload: AdCreativePayload = { ad_copy: adCopy, ad_creative: adCreativeWithPrice };
  const fullPrompt = buildImageGeneratorPrompt(payload, aspectRatio);

  const output = await run(IMAGE_MODEL, {
    prompt: fullPrompt,
    images: [inputImage],
    modalities: ["image", "text"],
  });

  const raw = Array.isArray(output) ? output[0] : output;
  const imageUrl = typeof raw === "string" ? raw : (raw as { url?: string })?.url;
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
  const userFeatures = options?.productFeatures?.trim()
    ? options.productFeatures.trim().split(/\n/).map((s) => s.trim()).filter(Boolean)
    : undefined;

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
    const priceCurrency = state.copyOutput?.currency ?? state.currency;
    emit("copy", {
      promptLabel: "Price agent",
      prompt: buildPriceCopyPrompt(lang, dialect, rawPrice, priceCurrency),
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
  const userFeatures = options?.productFeatures?.trim()
    ? options.productFeatures.trim().split(/\n/).map((s) => s.trim()).filter(Boolean)
    : undefined;
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
    const priceCurrency = state.copyOutput?.currency ?? state.currency;
    emit("copy", {
      promptLabel: "Price agent",
      prompt: buildPriceCopyPrompt(lang, dialect, rawPrice, priceCurrency),
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
