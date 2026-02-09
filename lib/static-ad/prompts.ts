import { JSON_OUTPUT, outputBlock } from "../prompts-common";

export type CopyLanguage = "en" | "fr" | "ar";
export type ArabicDialect = "algerian" | "tunisian" | "moroccan";

function langInstruction(lang: CopyLanguage, dialect?: ArabicDialect): string {
  if (lang === "en") return "LANGUAGE: All copy in English.";
  if (lang === "fr") return "LANGUAGE: All copy in French.";
  return `LANGUAGE: All copy in Arabic. Use ${dialect ?? "standard"} dialect—authentic phrasing for that region.`;
}

const FEATURES_TRANSLATED_SCHEMA = `{
  "features": ["translated1", "translated2", "translated3"]
}`;

const FEATURES_EXTRACT_SCHEMA = `{
  "features": ["feature1", "feature2", "feature3"]
}`;

const COPY_OUTPUT_SCHEMA = `{
  "headline": "string",
  "subheadline": "string or \\"\\"",
  "cta": "string",
  "price": "string or \\"\\""
}`;

export function buildCopyPrompt(
  language: CopyLanguage,
  dialect?: ArabicDialect
): string {
  return `## ROLE
You analyze product images and write conversion-focused ad copy.

## TASK
Extract ALL content from the image. Headline and CTA must be specific to THIS product—never generic.

## CTA (2–5 words)
Make it irresistible. Avoid "Shop Now" / "Buy Now". Prefer:
- Action+benefit: "Grab Yours", "Claim This Deal", "Unlock 20% Off"
- Urgency: "Limited Stock", "Last Chance", "Ends Tonight"
- Low commitment: "Try Free", "See How", "Check It Out"
- Desire: "I Want This", "Yes Please", "Reserve Mine"
- Product-specific: "Get Fitted", "Book a Demo", "Customize Yours"
- Emotional: "Treat Yourself", "Upgrade Now", "Make It Yours"

Match tone to product. User should feel they're getting something—not being sold to.

## RULES
- Badge text: One promotional badge if it fits (New Arrival, Limited Edition, Sale, etc). Use null if none fits.
- Subheadline: Include only if it adds value. Otherwise "".
- Price: Extract if visible on product/packaging. Otherwise "".
- Additional text: Include shop info or offers if relevant, with label "shop_info" or "offer".

${langInstruction(language, dialect)}

${outputBlock(`{
  "headline": "string",
  "badge_text": "string or null",
  "subheadline": "string or \"\"",
  "cta": "string",
  "price": "string or \"\"",
  "additional_text": [
    {
      "label": "shop_info|offer",
      "content": "text content"
    }
  ] | null
}`)}
`;
}

export const COPY_PROMPT = buildCopyPrompt("en");

export function buildFeaturesPrompt(
  language: CopyLanguage,
  dialect?: ArabicDialect,
  userFeatures?: string[]
): string {
  const lang = langInstruction(language, dialect);

  if (userFeatures?.length) {
    return `## TASK
Translate the user features into the target language. Do NOT analyze any image.

## RULES
- 2–5 words per feature. Preserve meaning and marketing appeal.

${lang}

## USER FEATURES
${JSON.stringify(userFeatures)}

${outputBlock(FEATURES_TRANSLATED_SCHEMA)}`;
  }

  return `## TASK
Analyze the product image. Extract 3–5 key features or selling points for an ad.

## RULES
- 2–5 words each. Benefits, specs, or unique qualities visible or inferable.

${lang}

${outputBlock(FEATURES_EXTRACT_SCHEMA)}`;
}

const CREATIVE_MUST = `## MUST (non-negotiable)
- **Layout**: Product 75–90% of frame. Headline large, impossible to miss. CTA most clickable element. Price well visible. Balanced, no overlap.
- **Product**: Same shape, colors, packaging globally. You MAY: POV/angle, zoom, lighting. Do NOT: reimagine, distort, hide items. Preserve packaging.
- **Colors**: Extract ONLY from product image. Max 2 colors (accent + optional secondary). No invented palette. Never white background.
- **Background**: Product-representative (skincare→wellness, tech→studio, food→kitchen). Contemporary, never generic.`;

const CREATIVE_FREEDOM = `## YOUR CREATIVE FREEDOM
- Fonts, positions, zoom, treatment—your choice
- Bold/accent placement, effects—your choice
- Subheadline: visible=true only when it adds value. When visible, max 16px.`;

const CREATIVE_JSON_SCHEMA = `Booleans: true/false, not strings.
{
  "accentColor": "extract from product—hex or name",
  "global_directive": {
    "vibe": "descriptive aesthetic name (e.g., 'Urban Streetwear Chic', 'Luxurious Elegance', 'Modern Minimalist')",
    "color_palette": {
      "cta_hex": "hex color for CTA buttons",
      "accent_hex": "hex color for accents",
      "background_hex": "hex color for background",
      "primary_text_hex": "hex color for primary text"
    },
    "typography_guide": "Specific font recommendations with usage notes (e.g., 'Headline: Bebas Neue (Bold), Body: Montserrat (Clean)')",
    "continuity_directives": [
      {
        "element_type": "texture_overlay|geometric_motif|pattern",
        "placement_hint": "where to place (e.g., 'Fading into corners', 'Bottom right corner')",
        "color_instruction": "Color with opacity (e.g., 'Silver #C0C0C0 at 5% opacity')",
        "visual_description": "Detailed description of the visual element"
      }
    ],
    "recurring_visual_elements": ["list of recurring elements"]
  },
  "text_content": {
    "headline": "string",
    "badge_text": "promotional badge or null",
    "price_text": "price string or null",
    "sub_headline": "string or null",
    "additional_text": [
      {
        "label": "feature|shop_info|offer",
        "content": "text content",
        "style_hint": "optional styling hint or null"
      }
    ] | null,
    "cta_button_text": "string",
    "text_styling_instructions": "Detailed styling instructions (e.g., 'Highlight key word with metallic glow effect. Use bold, condensed font.')"
  },
  "headline": {
    "font_family": "distinctive (Clash Display, Satoshi, General Sans—avoid generic)",
    "font_size": "48-64px, primary hook",
    "position": "",
    "has_bold": true,
    "bold_where": "",
    "has_accent": true,
    "accent_where": ""
  },
  "subheadline": {
    "visible": false,
    "font_family": "",
    "font_size": "max 14-16px",
    "position": "",
    "has_bold": false,
    "bold_where": "",
    "has_accent": false,
    "accent_where": ""
  },
  "product": {
    "reversed": false,
    "position": "center, hero zone",
    "zoom": "75-90% of frame",
    "rotation": "",
    "focus": "show ALL items from image",
    "treatment": "same product, new POV/lighting ok"
  },
  "composition_notes": "Layout guidance (e.g., 'Product focus center-right, headline top-left')",
  "visual_prompt_english": "Detailed English description for image generation (camera angle, lighting, background, mood, product positioning)",
  "requires_product_reference": true,
  "background": "product context, never white",
  "cta": {
    "has_background": true,
    "is_chip": false,
    "position": "bottom-center or bottom-right",
    "style": "24-32px, bold, high-contrast, glow/shadow, irresistibly clickable"
  },
  "price": {
    "has_background": true,
    "is_chip": false,
    "position": "near-cta or prominent",
    "style": "20-26px, bold, badge/pill, impossible to miss"
  },
  "effects": "subtle (glow, bokeh, lens flare)—nothing that obscures product"
}`;

export const CREATIVE_AGENT_PROMPT_BASE = `## ROLE
Creative director for product ads. Analyze the image and output a JSON spec for all visual elements.

${CREATIVE_MUST}

${CREATIVE_FREEDOM}

${outputBlock(CREATIVE_JSON_SCHEMA)}
`;

const FEATURES_JSON_BLOCK = `{
  "features": {
    "visible": true,
    "position": "",
    "font_family": "",
    "font_size": "12-14px",
    "layout": "bullets|badges|inline|stacked",
    "style": "checkmarks, icons, minimal"
  }
}`;

export function buildCreativeAgentPrompt(adCopy?: { headline: string; subheadline: string; cta: string; price?: string; badge_text?: string | null; additional_text?: Array<{ label: string; content: string }> | null; features?: string[] }): string {
  if (!adCopy?.features?.length) return CREATIVE_AGENT_PROMPT_BASE;

  return `${CREATIVE_AGENT_PROMPT_BASE}

## AD COPY (inform layout and hierarchy)
${JSON.stringify(adCopy, null, 2)}

When features are present, add "features" to your JSON:
${FEATURES_JSON_BLOCK}

When badge_text or additional_text are present, include them in text_content with appropriate labels (badge_text, shop_info, offer, etc.).`;
}

export const CREATIVE_AGENT_PROMPT = buildCreativeAgentPrompt();

export const IMAGE_GENERATOR_PROMPT_PREFIX = `Create this ad. Product: same shape, colors, packaging—instantly recognizable. You MAY: POV/angle, zoom, lighting. Do NOT radically transform. Follow visual_prompt_english and composition_notes when provided in the spec.`;
