export type CopyLanguage = "en" | "fr" | "ar";
export type ArabicDialect = "algerian" | "tunisian" | "moroccan";

function getLanguageInstruction(lang: CopyLanguage, dialect?: ArabicDialect): string {
  if (lang === "en") return "LANGUAGE: All copy in English.";
  if (lang === "fr") return "LANGUAGE: All copy in French.";
  return `LANGUAGE: All copy in Arabic. Use ${dialect ?? "standard"} dialect—authentic phrasing for that region.`;
}

const COPY_RULES = {
  cta: "2–5 words. Make it irresistible. Avoid generic 'Shop Now' / 'Buy Now'. Prefer: Action+benefit ('Grab Yours', 'Claim This Deal'), Urgency ('Limited Stock', 'Last Chance'), Low commitment ('Try Free', 'See How'), Desire ('Treat Yourself', 'Upgrade Now'), Product-specific ('Get Fitted', 'Book a Demo'). Match tone to product.",
  badge: "Default to null—no badge. Only output a badge when there is a clear promotional label (e.g. New Arrival, Limited Edition, Sale). Do NOT use shipping/offer text like 'Free Shipping' or 'توصيل مجاني' as a badge. Prefer null.",
  subheadline: "Include only if it adds value. Otherwise \"\".",
  price:
    "Extract if visible on product/packaging. Otherwise \"\". Always write price copy in the selected language with creative, cool phrasing. STRICTLY FORBIDDEN: literal patterns like \"1 for 2500\" or \"2 for 3900\"—rewrite them into natural, persuasive lines (e.g., English \"1 × 2,500\" / \"2 × 3,900 — best value\", French \"1 × 2 500\" / \"2 × 3 900 — meilleure offre\", Arabic equivalents). One line per offer; optional \"+ Free shipping\" on a line. For multiple tiers, use one line each, same style, and make the best-value offer clearly stand out with wording that highlights the deal (\"save more\", \"best value\", etc.). Keep it punchy, conversion-focused, and natively phrased in the target language.",
  additional_text: "Include shop info or offers if relevant, with label 'shop_info' or 'offer'. Use null if none.",
} as const;

export function buildCopyPrompt(
  language: CopyLanguage,
  dialect?: ArabicDialect
): string {
  const corePrompt = {
    role: "You analyze product images and write conversion-focused ad copy for a single static ad (one frame).",
    task: "Extract ALL content from the image. Headline and CTA must be specific to THIS product—never generic.",
    ad_structure: {
      image: {
        purpose: "Single static ad",
        content: "Product hero + headline + optional badge + optional subheadline + price + CTA + optional shop info or offer text",
      },
    },
    rules: {
      cta: COPY_RULES.cta,
      badge_text: COPY_RULES.badge,
      subheadline: COPY_RULES.subheadline,
      price: COPY_RULES.price,
      additional_text: COPY_RULES.additional_text,
    },
    language: getLanguageInstruction(language, dialect).replace("LANGUAGE: ", ""),
  };

  const outputs = {
    description:
      "Output valid JSON only for the static ad copy: no comments (no // or /* */), no trailing commas, no markdown, no code blocks. Start with { and end with }. Output must parse with JSON.parse.",
    schema: {
      headline: {
        type: "string",
        description: "Main attention-grabbing headline, specific to THIS product—never generic",
        required: true,
      },
      badge_text: {
        type: "string | null",
        description: COPY_RULES.badge,
        required: false,
      },
      subheadline: {
        type: "string",
        description: COPY_RULES.subheadline,
        required: true,
        allow_empty: true,
      },
      cta: {
        type: "string",
        description: "Call-to-action 2–5 words that feels irresistible and specific to this product",
        required: true,
      },
      price: {
        type: "string",
        description: COPY_RULES.price,
        required: true,
        allow_empty: true,
      },
      currency: {
        type: "string",
        description:
          "Currency symbol or code inferred from the price (for example 'DZD', '€', '$'). Optional; keep empty string if unclear.",
        required: false,
        allow_empty: true,
      },
      additional_text: {
        type: "array | null",
        description: COPY_RULES.additional_text,
        required: false,
        items: { label: "shop_info | offer", content: "string" },
      },
    },
    example: {
      headline: "Premium Wireless Earbuds",
      badge_text: null,
      subheadline: "Crystal-clear sound meets all-day comfort",
      cta: "Grab Yours",
      price: "$99.99",
      currency: "USD",
      additional_text: [{ label: "shop_info", content: "AudioHub" }],
    },
  };

  const wrapped = {
    prompt: corePrompt,
    outputs,
  };

  return JSON.stringify(wrapped, null, 2);
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
    const corePrompt = {
      task: "Translate the user features into the target language. Do NOT analyze any image.",
      rules: { features: FEATURE_RULES.translated },
      language: langInstruction,
      user_features: userFeatures,
    };

    const outputs = {
      description:
        "Output valid JSON only for translated features: no comments (no // or /* */), no trailing commas, no markdown, no code blocks. Start with { and end with }. Output must parse with JSON.parse.",
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
    };

    const wrapped = {
      prompt: corePrompt,
      outputs,
    };

    return JSON.stringify(wrapped, null, 2);
  }

  const corePrompt = {
    task: "Analyze the product image. Extract 3–5 key features or selling points for an ad.",
    rules: { features: FEATURE_RULES.extract },
    language: langInstruction,
  };

  const outputs = {
    description:
      "Output valid JSON only for extracted features: no comments (no // or /* */), no trailing commas, no markdown, no code blocks. Start with { and end with }. Output must parse with JSON.parse.",
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
  };

  const wrapped = {
    prompt: corePrompt,
    outputs,
  };

  return JSON.stringify(wrapped, null, 2);
}

/** Prompt for price_agent (static): raw price lines → persuasive price copy. Each price must include its currency next to it. */
export function buildPriceCopyPrompt(
  language: CopyLanguage,
  dialect: ArabicDialect | undefined,
  rawPrice: string,
  currency?: string
): string {
  const langInstruction = getLanguageInstruction(language, dialect).replace("LANGUAGE: ", "");
  const currencyRule = currency
    ? `Each price MUST be written with its currency next to it. Use: ${currency}. Arabic + DZD → "دج" after amount (e.g. 3,900 دج). Otherwise use code (e.g. 3,900 DZD, 99.99 USD). Never output only digits. Preserve exact numbers from input.`
    : "Each price must include its currency next to it (e.g. 3,900 DZD, 99 USD, 3,900 دج). Never output only a number.";

  const examplePrice =
    currency === "DZD" && language === "ar"
      ? "1 × 2,500 دج\\n2 × 3,900 دج — أفضل قيمة"
      : "1 × 2,500 DZD\\n2 × 3,900 DZD — best value";
  const examplePriceSingle =
    currency === "DZD" && language === "ar" ? "3,900 دج" : "3,900 DZD";

  const corePrompt = {
    role: "Pricing copywriter for static ads. Rewrite raw price lines into persuasive copy for a single-frame ad.",
    language: langInstruction,
    rules: {
      price: COPY_RULES.price,
      currency: currencyRule,
      behavior:
        "One line per offer. Preserve exact numeric values (you may add thousands separators). One offer: one line with currency. Multiple offers: one line each, each with currency; highlight best-value in wording.",
    },
    input_price_lines: rawPrice,
    task:
      "Rewrite input into final price copy. Output language = target language. Each price must appear with its currency next to it (e.g. 3,900 DZD or 3,900 دج). No explanation, no extra text. Valid JSON only.",
  };

  const outputs = {
    description: "JSON only: no comments, no trailing commas, no markdown. Starts with {, ends with }. Parses with JSON.parse.",
    schema: {
      price: {
        type: "string",
        description: "One string; use \\n between offers. Every line: amount + currency next to it. Include best-value wording where relevant.",
        required: true,
      },
    },
    example: { price: examplePrice },
    example_single: { price: examplePriceSingle },
  };

  return JSON.stringify({ prompt: corePrompt, outputs }, null, 2);
}

const CREATIVE_MUST = {
  layout:
    "Product 75–90% of frame and ALWAYS clearly visible in the final image—never cropped off-screen, hidden behind text, or replaced by abstract shapes. Headline large, impossible to miss. CTA most clickable element. Price well visible in a clean, modern badge or pill near CTA. If multiple price lines or offers exist, stack them with clear spacing and hierarchy, and visually highlight the best-value offer (e.g., stronger contrast, subtle glow, or 'Best value' micro-label). When features are present, make them LARGE and highly readable for conversion: use a prominent feature block (not a tiny cluster)—each feature with bold text (18–26px equivalent) and a clear icon or mini visual so the client can instantly see product benefits. Features must be big enough to read at a glance and drive the purchase decision. Balanced, no overlap. Always frame the scene in a clear conversion moment: the viewer should instantly feel that this is the right time to buy.",
  product:
    "Same shape, colors, packaging globally. You MAY: POV/angle, zoom, lighting. Do NOT: reimagine, distort, hide items. Preserve packaging. The physical device or product itself must be unambiguously visible and recognizable—never implied only by icons or abstract shapes. The ad MUST look like the product is USED in real life: show it in active use (in a hand, on a desk in use, on skin, being worn, in a real setting with context of use)—so it feels lived-in and desirable, not sterile. The customer should see exactly how the product looks when used, reinforcing the decision to buy.",
  colors: "Extract ONLY from product image. Max 2 colors (accent + optional secondary). No invented palette. Never white background.",
  background:
    "Product-representative (skincare→wellness, tech→studio, food→kitchen). Contemporary, never generic. The environment must feel like real-life usage: the product in context where it would actually be used (desk, bathroom, kitchen, hand, body). Prefer scenes that look USED and authentic—real moment of use or \"after\" state—so the viewer imagines owning and using the product. Avoid sterile studio-only shots; favor in-context, in-use scenes that convert.",
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
  const corePrompt: Record<string, unknown> = {
    role: "Creative director for product ads. Analyze the image and output a JSON spec for all visual elements.",
    must_non_negotiable: {
      layout: { description: CREATIVE_MUST.layout, required: true },
      product: { description: CREATIVE_MUST.product, required: true },
      colors: { description: CREATIVE_MUST.colors, required: true },
      background: { description: CREATIVE_MUST.background, required: true },
    },
    creative_freedom: CREATIVE_FREEDOM,
  };

  if (adCopy?.headline && (adCopy?.features?.length || adCopy?.badge_text || (adCopy?.additional_text?.length ?? 0) > 0)) {
    corePrompt.ad_copy = adCopy;
    corePrompt.ad_copy_notes =
      "When features are present, add 'features' to your JSON (visible, position, font_family, font_size, layout, style). Make features BIG and conversion-focused: use font_size 18–26px so the client can read them at a glance. Treat features as a prominent, readable block (bullets, badges, or stacked list) with clear icons or mini visuals—each feature must be large enough to sell the product. Do not use tiny 12–14px text; features are key selling points and must be clearly visible. When badge_text or additional_text are present, include them in text_content with appropriate labels (badge_text, shop_info, offer).";
  }

  const outputs = {
    description:
      "Output strict JSON only for the static ad creative spec. No trailing commas—never put a comma before } or ]. No comments (no // or /* */). No markdown or code blocks. Start with { and end with }. Must parse with JSON.parse.",
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
          font_size: { type: "string", description: "18-26px — large and readable so the client can see product benefits and convert" },
          layout: {
            type: "string",
            description: "bullets|badges|inline|stacked — prominent block so features are easy to read and drive conversion",
          },
          style: {
            type: "string",
            description:
              "checkmarks, icons, or mini product/device thumbnails; keep features visually prominent and readable",
          },
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
      features: { visible: true, position: "below product", font_family: "Montserrat", font_size: "22px", layout: "bullets", style: "checkmarks" },
    },
  };

  const wrapped = {
    prompt: corePrompt,
    outputs,
  };

  return JSON.stringify(wrapped, null, 2);
}

export const IMAGE_GENERATOR_PROMPT_PREFIX =
  "Create this ad. Product: same shape, colors, packaging—instantly recognizable. The actual device/product must be clearly visible and dominant in the frame—never removed, hidden behind typography, or replaced by purely abstract symbols. The ad MUST look like the product is USED in real life: show it in active use (in hand, on desk, on skin, in a real setting) so it feels lived-in and converts. You MAY change POV/angle, zoom, and lighting, but keep the product body readable and recognizable. When features are specified, render them LARGE and readable (18–26px equivalent): each feature with bold, visible text and a clear icon or mini visual so the client can see product benefits at a glance and convert. Do not use tiny feature text. Whenever the spec or scene implies usage, show the product in use or in its final real-life context to maximize conversion. MANDATORY: When ad_creative.text_content.price_text or ad_copy.price is provided, you MUST render that exact price text visibly on the ad—in a clean badge or pill near the CTA, clearly readable (e.g. 20–26px bold). Never omit or replace the price. Follow visual_prompt_english and composition_notes when provided in the spec.";
