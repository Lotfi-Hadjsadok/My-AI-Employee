export type CopyLanguage = "en" | "fr" | "ar";
export type ArabicDialect = "algerian" | "tunisian" | "moroccan";

function getLanguageInstruction(lang: CopyLanguage, dialect?: ArabicDialect): string {
  if (lang === "en") return "LANGUAGE: All copy in English.";
  if (lang === "fr") return "LANGUAGE: All copy in French.";
  return `LANGUAGE: All copy in Arabic. Use ${dialect ?? "standard"} dialect—authentic phrasing for that region.`;
}

const COPY_RULES = {
  cta: "2–5 words. Make it irresistible. Avoid generic 'Shop Now' / 'Buy Now'. Prefer: Action+benefit ('Grab Yours', 'Claim This Deal'), Urgency ('Limited Stock', 'Last Chance'), Low commitment ('Try Free', 'See How'), Desire ('Treat Yourself', 'Upgrade Now'), Product-specific ('Get Fitted', 'Book a Demo'). Match tone to product.",
  badge: "One promotional badge if it fits (New Arrival, Limited Edition, Sale, etc). Use null if none fits.",
  subheadline: "Include only if it adds value. Otherwise \"\".",
  price:
    "Extract if visible on product/packaging. Otherwise \"\". Always write price copy in the selected language with creative, cool phrasing. STRICTLY FORBIDDEN: literal patterns like \"1 for 2500\" or \"2 for 3900\"—rewrite them into natural, persuasive lines (e.g., English \"1 × 2,500\" / \"2 × 3,900 — best value\", French \"1 × 2 500\" / \"2 × 3 900 — meilleure offre\", Arabic equivalents). One line per offer; optional \"+ Free shipping\" on a line. For multiple tiers, use one line each, same style, and make the best-value offer clearly stand out with wording that highlights the deal (\"save more\", \"best value\", etc.). Keep it punchy, conversion-focused, and natively phrased in the target language.",
  additional_text: "Include shop info or offers if relevant, with label 'shop_info' or 'offer'. Use null if none.",
} as const;

export function buildCopyPrompt(
  language: CopyLanguage,
  dialect?: ArabicDialect
): string {
  const prompt = {
    role: "You analyze product images and write conversion-focused ad copy.",
    task: "Extract ALL content from the image. Headline and CTA must be specific to THIS product—never generic.",
    rules: {
      cta: COPY_RULES.cta,
      badge_text: COPY_RULES.badge,
      subheadline: COPY_RULES.subheadline,
      price: COPY_RULES.price,
      additional_text: COPY_RULES.additional_text,
    },
    language: getLanguageInstruction(language, dialect).replace("LANGUAGE: ", ""),
    output_format: {
      description: "Output valid JSON only: no comments (no // or /* */), no trailing commas, no markdown, no code blocks. Start with { and end with }. Output must parse with JSON.parse.",
      schema: {
        headline: { type: "string", description: "Main attention-grabbing headline, specific to THIS product", required: true },
        badge_text: { type: "string | null", description: COPY_RULES.badge, required: false },
        subheadline: { type: "string", description: COPY_RULES.subheadline, required: true, allow_empty: true },
        cta: { type: "string", description: "Call-to-action 2–5 words", required: true },
        price: { type: "string", description: COPY_RULES.price, required: true, allow_empty: true },
        additional_text: {
          type: "array | null",
          description: COPY_RULES.additional_text,
          required: false,
          items: { label: "shop_info | offer", content: "string" },
        },
      },
      example: {
        headline: "Premium Wireless Earbuds",
        badge_text: "New Arrival",
        subheadline: "Crystal-clear sound meets all-day comfort",
        cta: "Grab Yours",
        price: "$99.99",
        additional_text: [{ label: "shop_info", content: "AudioHub" }],
      },
    },
  };
  return JSON.stringify(prompt, null, 2);
}

const FEATURE_RULES = {
  translated: "2–5 words per feature. Preserve meaning and marketing appeal.",
  extract: "3–5 key features or selling points. 2–5 words each. Benefits, specs, or unique qualities visible or inferable.",
} as const;

export function buildFeaturesPrompt(
  language: CopyLanguage,
  dialect?: ArabicDialect,
  userFeatures?: string[]
): string {
  const langInstruction = getLanguageInstruction(language, dialect).replace("LANGUAGE: ", "");

  if (userFeatures?.length) {
    const prompt = {
      task: "Translate the user features into the target language. Do NOT analyze any image.",
      rules: { features: FEATURE_RULES.translated },
      language: langInstruction,
      user_features: userFeatures,
      output_format: {
        description: "Output valid JSON only: no comments (no // or /* */), no trailing commas, no markdown, no code blocks. Start with { and end with }. Output must parse with JSON.parse.",
        schema: {
          features: {
            type: "array",
            description: "Translated feature strings, same order as user_features",
            items: { type: "string" },
          },
        },
        example: {
          features: ["Sans fil", "Batterie 24h", "Étanche"],
        },
      },
    };
    return JSON.stringify(prompt, null, 2);
  }

  const prompt = {
    task: "Analyze the product image. Extract 3–5 key features or selling points for an ad.",
    rules: { features: FEATURE_RULES.extract },
    language: langInstruction,
    output_format: {
      description: "Output valid JSON only: no comments (no // or /* */), no trailing commas, no markdown, no code blocks. Start with { and end with }. Output must parse with JSON.parse.",
      schema: {
        features: {
          type: "array",
          description: "Array of 3–5 feature strings, 2–5 words each",
          min_items: 3,
          max_items: 5,
          items: { type: "string" },
        },
      },
      example: {
        features: ["Waterproof", "24hr battery", "Durable build", "Comfort fit"],
      },
    },
  };
  return JSON.stringify(prompt, null, 2);
}

/** Build a prompt for the price_agent, which rewrites raw user-provided price lines into persuasive, well-formatted price copy. */
export function buildPriceCopyPrompt(
  language: CopyLanguage,
  dialect: ArabicDialect | undefined,
  rawPrice: string
): string {
  const langInstruction = getLanguageInstruction(language, dialect).replace("LANGUAGE: ", "");
  const prompt = {
    role: "You are a pricing copywriter for ads. You receive raw price lines and must rewrite them into persuasive, well-formatted price copy.",
    language: langInstruction,
    rules: {
      price: COPY_RULES.price,
      behavior:
        "Treat each non-empty input line as one offer. If there is only ONE offer, you may keep it simple but still follow number formatting and language conventions. If there are TWO OR MORE offers, clearly highlight the best-value offer in wording (e.g., 'best value', 'save more') while keeping the text concise and native-sounding in the target language.",
    },
    input_price_lines: rawPrice,
    task:
      "Rewrite the input price lines into final price copy to be printed on an ad. Do NOT explain anything. Do NOT add any text that is not directly related to the price/offer. Respect the target language for all words except brand or shop names.",
    output_format: {
      description:
        "Output valid JSON only: no comments (no // or /* */), no trailing commas, no markdown, no code blocks. Start with { and end with }. Output must parse with JSON.parse.",
      schema: {
        price: {
          type: "string",
          description:
            "Final price copy as one string. Use line breaks (\\n) between different offers when there are multiple lines. Must already include any wording that highlights the best-value offer.",
          required: true,
        },
      },
      example: {
        price: "1 × 2,500 DZD\\n2 × 3,900 DZD — best value",
      },
    },
  };
  return JSON.stringify(prompt, null, 2);
}

const CREATIVE_MUST = {
  layout:
    "Product 75–90% of frame. Headline large, impossible to miss. CTA most clickable element. Price well visible in a clean, modern badge or pill near CTA. If multiple price lines or offers exist, stack them with clear spacing and hierarchy, and visually highlight the best-value offer (e.g., stronger contrast, subtle glow, or 'Best value' micro-label). Balanced, no overlap.",
  product: "Same shape, colors, packaging globally. You MAY: POV/angle, zoom, lighting. Do NOT: reimagine, distort, hide items. Preserve packaging.",
  colors: "Extract ONLY from product image. Max 2 colors (accent + optional secondary). No invented palette. Never white background.",
  background: "Product-representative (skincare→wellness, tech→studio, food→kitchen). Contemporary, never generic.",
} as const;

const CREATIVE_FREEDOM = {
  fonts_positions: "Fonts, positions, zoom, treatment—your choice",
  bold_effects: "Bold/accent placement, effects—your choice",
  subheadline: "Subheadline visible=true only when it adds value. When visible, max 16px.",
} as const;

export function buildCreativeAgentPrompt(adCopy?: {
  headline: string;
  subheadline: string;
  cta: string;
  price?: string;
  badge_text?: string | null;
  additional_text?: Array<{ label: string; content: string }> | null;
  features?: string[];
}): string {
  const prompt: Record<string, unknown> = {
    role: "Creative director for product ads. Analyze the image and output a JSON spec for all visual elements.",
    must_non_negotiable: {
      layout: { description: CREATIVE_MUST.layout, required: true },
      product: { description: CREATIVE_MUST.product, required: true },
      colors: { description: CREATIVE_MUST.colors, required: true },
      background: { description: CREATIVE_MUST.background, required: true },
    },
    creative_freedom: CREATIVE_FREEDOM,
    output_format: {
      description: "Output strict JSON only. No trailing commas—never put a comma before } or ]. No comments (no // or /* */). No markdown or code blocks. Start with { and end with }. Must parse with JSON.parse.",
      schema: {
        accentColor: { type: "string", description: "Extract from product—hex or name", required: true },
        global_directive: {
          type: "object",
          properties: {
            vibe: { type: "string", description: "Descriptive aesthetic name (e.g., 'Urban Streetwear Chic', 'Luxurious Elegance')" },
            color_palette: {
              type: "object",
              properties: {
                cta_hex: { type: "string" },
                accent_hex: { type: "string" },
                background_hex: { type: "string" },
                primary_text_hex: { type: "string" },
              },
            },
            typography_guide: { type: "string" },
            continuity_directives: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  element_type: { enum: ["texture_overlay", "geometric_motif", "pattern"] },
                  placement_hint: { type: "string" },
                  color_instruction: { type: "string" },
                  visual_description: { type: "string" },
                },
              },
            },
            recurring_visual_elements: { type: "array", items: { type: "string" } },
          },
        },
        text_content: {
          type: "object",
          properties: {
            headline: { type: "string" },
            badge_text: { type: "string | null" },
            price_text: {
              type: "string | null",
              description:
                "Exact price text, including any stacked offers if present. Keep it short and conversion-focused so it can be rendered as a bold badge or pill near the CTA.",
            },
            sub_headline: { type: "string | null" },
            additional_text: {
              type: "array | null",
              items: { type: "object", properties: { label: { type: "string" }, content: { type: "string" }, style_hint: { type: "string | null" } } },
            },
            cta_button_text: { type: "string | null" },
            text_styling_instructions: { type: "string" },
          },
        },
        headline: {
          type: "object",
          properties: {
            font_family: { type: "string", description: "Distinctive (Clash Display, Satoshi—avoid generic)" },
            font_size: { type: "string", description: "48-64px, primary hook" },
            position: { type: "string" },
            has_bold: { type: "boolean" },
            bold_where: { type: "string" },
            has_accent: { type: "boolean" },
            accent_where: { type: "string" },
          },
        },
        subheadline: {
          type: "object",
          properties: {
            visible: { type: "boolean" },
            font_family: { type: "string" },
            font_size: { type: "string", description: "max 14-16px" },
            position: { type: "string" },
            has_bold: { type: "boolean" },
            bold_where: { type: "string" },
            has_accent: { type: "boolean" },
            accent_where: { type: "string" },
          },
        },
        product: {
          type: "object",
          properties: {
            reversed: { type: "boolean" },
            position: { type: "string", description: "center, hero zone" },
            zoom: { type: "string", description: "75-90% of frame" },
            rotation: { type: "string" },
            focus: { type: "string", description: "show ALL items from image" },
            treatment: { type: "string" },
          },
        },
        composition_notes: { type: "string" },
        visual_prompt_english: { type: "string", description: "Detailed English description for image generation" },
        requires_product_reference: { type: "boolean" },
        background: { type: "string", description: "Product context, never white" },
        cta: {
          type: "object",
          properties: {
            has_background: { type: "boolean" },
            is_chip: { type: "boolean" },
            position: { type: "string" },
            style: { type: "string", description: "24-32px, bold, high-contrast" },
          },
        },
        price: {
          type: "object",
          properties: {
            has_background: { type: "boolean" },
            is_chip: { type: "boolean" },
            position: { type: "string" },
            style: { type: "string", description: "20-26px, bold, badge/pill" },
          },
        },
        effects: { type: "string", description: "Subtle (glow, bokeh)—nothing that obscures product" },
        features: {
          type: "object",
          required: false,
          properties: {
            visible: { type: "boolean" },
            position: { type: "string" },
            font_family: { type: "string" },
            font_size: { type: "string", description: "12-14px" },
            layout: { type: "string", description: "bullets|badges|inline|stacked" },
            style: { type: "string", description: "checkmarks, icons, minimal" },
          },
        },
      },
      example: {
        accentColor: "#2563eb",
        global_directive: {
          vibe: "Modern Minimalist",
          color_palette: { cta_hex: "#2563eb", accent_hex: "#2563eb", background_hex: "#f8fafc", primary_text_hex: "#0f172a" },
          typography_guide: "Headline: Bebas Neue (Bold), Body: Montserrat (Clean)",
          continuity_directives: [],
          recurring_visual_elements: [],
        },
        text_content: {
          headline: "Premium Wireless Earbuds",
          badge_text: "New Arrival",
          price_text: "$99.99",
          sub_headline: "Crystal-clear sound",
          additional_text: null,
          cta_button_text: "Grab Yours",
          text_styling_instructions: "Headline bold, accent on key word.",
        },
        headline: { font_family: "Bebas Neue", font_size: "56px", position: "top-left", has_bold: true, bold_where: "first phrase", has_accent: true, accent_where: "key word" },
        subheadline: { visible: true, font_family: "Montserrat", font_size: "14px", position: "below headline", has_bold: false, bold_where: "", has_accent: false, accent_where: "" },
        product: { reversed: false, position: "center", zoom: "80%", rotation: "", focus: "all items", treatment: "same product, new POV ok" },
        composition_notes: "Product center-right, headline top-left",
        visual_prompt_english: "Studio lighting, soft shadows, product hero shot",
        requires_product_reference: true,
        background: "Soft gradient, product context",
        cta: { has_background: true, is_chip: false, position: "bottom-center", style: "28px bold, high-contrast" },
        price: { has_background: true, is_chip: false, position: "near-cta", style: "22px bold badge" },
        effects: "subtle glow, soft bokeh",
        features: { visible: true, position: "below product", font_family: "Montserrat", font_size: "13px", layout: "bullets", style: "checkmarks" },
      },
    },
  };

  if (adCopy?.headline && (adCopy?.features?.length || adCopy?.badge_text || (adCopy?.additional_text?.length ?? 0) > 0)) {
    prompt.ad_copy = adCopy;
    prompt.ad_copy_notes =
      "When features are present, add 'features' to your JSON (visible, position, font_family, font_size, layout, style). When badge_text or additional_text are present, include them in text_content with appropriate labels (badge_text, shop_info, offer).";
  }

  return JSON.stringify(prompt, null, 2);
}

export const IMAGE_GENERATOR_PROMPT_PREFIX =
  "Create this ad. Product: same shape, colors, packaging—instantly recognizable. You MAY: POV/angle, zoom, lighting. Do NOT radically transform. Follow visual_prompt_english and composition_notes when provided in the spec.";
