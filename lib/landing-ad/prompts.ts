export type CopyLanguage = "en" | "fr" | "ar";
export type ArabicDialect = "algerian" | "tunisian" | "moroccan";

// Product treatment constants
const SECTION_2_PRODUCT_TREATMENTS = "45° angle, macro close-up, dramatic side shot, exploded view, floating layers, reflection/mirror, through-the-object perspective, or split/comparison";
const SECTION_3_PRODUCT_TREATMENTS = "in-use, aspirational, lifestyle context, dramatic lighting, or unexpected visual treatment that sparks desire";

// Format constants
const PANEL_FORMATS = {
  SQR: { ratio: "1:1", description: "Square format" },
  WIDE: { ratio: "9:16", description: "Portrait format" },
} as const;

const BACKGROUND_MOTIF_DESCRIPTION = "One continuous concept—section 1 establishes it, section 2 continues it, section 3 continues it";

// Language instruction helper
function getLanguageInstruction(lang: CopyLanguage, dialect?: ArabicDialect): string {
  const instructions: Record<CopyLanguage, string> = {
    en: "LANGUAGE: All copy in English.",
    fr: "LANGUAGE: All copy in French.",
    ar: `LANGUAGE: All copy in Arabic. Use ${dialect ?? "standard"} dialect.`,
  };
  return instructions[lang];
}

// Common instruction blocks
const COPY_RULES = {
  tag: 'One promotional tag if it fits (Free Shipping, 50% Off, Limited Stock, Sale, New Arrival, etc). Use "" if none fits. Used in section 1.',
  price: 'Extract if visible on product/packaging. Otherwise "". Used in section 3.',
  section3Headline: "2–5 words. Urgency, trust, or value.",
  section3Subheadline: "4–12 words. Reassurance or benefit.",
  cta: "2–5 words. Action+benefit, urgency, or low-commitment. Used ONLY in section 3.",
  shopInfo: 'If shop name is available, include in section 3 additional_text with label "shop_info".',
} as const;

const FEATURE_RULES = {
  visual: "Descriptive visual representation of the feature. 8–20 words describing a graphic, illustration, or visual element that represents the feature (e.g., 'Water droplet with protective shield around it, showing waterproof protection', 'Battery icon with 24-hour clock overlay, showing full charge indicator').",
  text: "2–5 words. Product benefit, not brand claim.",
  description: "5–12 words. What the buyer gets.",
  productOnly: 'What it does, specs, materials, benefits. NO brand claims ("Trusted brand", "Award-winning", etc).',
} as const;

export function buildCopyPrompt(
  language: CopyLanguage,
  dialect?: ArabicDialect
): string {
  const prompt = {
    role: "You analyze product images and write conversion-focused copy for a 3-section landing page.",
    task: "Extract ALL content from the image. Headline and CTA must be specific to THIS product—never generic.",
    section_structure: {
      section_1: {
        purpose: "Hero",
        content: "Product (biggest) + headline + subheadline"
      },
      section_2: {
        purpose: "Features",
        content: `Product features + product image shown creatively differently (${SECTION_2_PRODUCT_TREATMENTS})—never repeat hero shot`
      },
      section_3: {
        purpose: "Conversion",
        content: "Product (emotional: in-use, aspirational) + CTA + price"
      }
    },
    rules: {
      tag_badge: COPY_RULES.tag,
      price: COPY_RULES.price,
      section_3_headline: COPY_RULES.section3Headline,
      section_3_subheadline: COPY_RULES.section3Subheadline,
      cta: COPY_RULES.cta,
      shop_info: COPY_RULES.shopInfo
    },
    language: getLanguageInstruction(language, dialect).replace("LANGUAGE: ", ""),
    output_format: {
      description: "Output pure JSON only. No comments, no markdown, no code blocks. Start with { and end with }. Must be parseable by JSON.parse.",
      schema: {
        section_1: {
          type: "object",
          description: "Hero section content",
          properties: {
            headline: {
              type: "string",
              description: "Main attention-grabbing headline for hero section, specific to THIS product—never generic",
              required: true
            },
            subheadline: {
              type: "string",
              description: "Supporting text that expands on headline, specific to THIS product",
              required: true
            },
            tag: {
              type: "string",
              description: COPY_RULES.tag,
              required: true,
              allow_empty: true
            },
            badge_text: {
              type: "string | null",
              description: "Same as tag but can be more creative presentation. Use null if tag is empty.",
              required: false
            }
          }
        },
        section_2: {
          type: "object",
          description: "Features section (empty object - features extracted separately)",
          properties: {}
        },
        section_3: {
          type: "object",
          description: "Conversion section content",
          properties: {
            headline: {
              type: "string",
              description: COPY_RULES.section3Headline,
              required: true,
              word_count: "2–5 words"
            },
            subheadline: {
              type: "string",
              description: COPY_RULES.section3Subheadline,
              required: true,
              word_count: "4–12 words"
            },
            cta: {
              type: "string",
              description: COPY_RULES.cta,
              required: true,
              word_count: "2–5 words"
            },
            price: {
              type: "string",
              description: COPY_RULES.price,
              required: true,
              allow_empty: true
            },
            shop_info: {
              type: "string | null",
              description: COPY_RULES.shopInfo,
              required: false
            }
          }
        }
      },
      example: {
        section_1: {
          headline: "Premium Wireless Earbuds",
          subheadline: "Crystal-clear sound meets all-day comfort",
          tag: "Free Shipping",
          badge_text: "Free Shipping"
        },
        section_2: {},
        section_3: {
          headline: "Get Yours Today",
          subheadline: "Join thousands of satisfied customers",
          cta: "Buy Now",
          price: "$99.99",
          shop_info: null
        }
      }
    }
  };
  
  return JSON.stringify(prompt, null, 2);
}

export interface FeatureItem {
  visual?: string;
  text: string;
  description?: string;
}


export function buildFeaturesPrompt(
  language: CopyLanguage,
  dialect?: ArabicDialect,
  userFeatures?: string[]
): string {
  const langInstruction = getLanguageInstruction(language, dialect).replace("LANGUAGE: ", "");

  if (userFeatures?.length) {
    const prompt = {
      task: "Translate each user feature into the target language. Output visual + text + description.",
      rules: {
        visual: {
          description: FEATURE_RULES.visual,
          type: "string"
        },
        text: {
          description: FEATURE_RULES.text,
          type: "string",
          word_count: "2–5 words"
        },
        description: {
          description: FEATURE_RULES.description,
          type: "string",
          word_count: "5–12 words"
        }
      },
      language: langInstruction,
      user_features: userFeatures,
      output_format: {
        description: "Output pure JSON only. No comments, no markdown, no code blocks. Start with { and end with }. Must be parseable by JSON.parse.",
        schema: {
          section_2: {
            type: "object",
            description: "Features section",
            properties: {
              features: {
                type: "array",
                description: "Array of product features with visual, text, and description",
                items: {
                  type: "object",
                  properties: {
                    visual: {
                      type: "string",
                      description: FEATURE_RULES.visual,
                      example: "Water droplet with protective shield around it, showing waterproof protection"
                    },
                    text: {
                      type: "string",
                      description: FEATURE_RULES.text,
                      word_count: "2–5 words",
                      example: "Waterproof"
                    },
                    description: {
                      type: "string",
                      description: FEATURE_RULES.description,
                      word_count: "5–12 words",
                      example: "Survives splashes and rain"
                    }
                  }
                }
              }
            }
          }
        },
        example: {
          section_2: {
            features: [
              { visual: "Water droplet with protective shield around it, showing waterproof protection", text: "Waterproof", description: "Survives splashes and rain" },
              { visual: "Battery icon with 24-hour clock overlay, showing full charge indicator", text: "24hr battery", description: "All-day power without charging" }
            ]
          }
        }
      }
    };
    return JSON.stringify(prompt, null, 2);
  }

  const prompt = {
    task: "Analyze the product image. Extract 3–5 key PRODUCT features.",
    rules: {
      product_only: {
        description: FEATURE_RULES.productOnly,
        type: "string"
      },
      visual: {
        description: FEATURE_RULES.visual,
        type: "string"
      },
      text: {
        description: FEATURE_RULES.text,
        type: "string",
        word_count: "2–5 words"
      },
      description: {
        description: FEATURE_RULES.description,
        type: "string",
        word_count: "5–12 words"
      }
    },
    language: langInstruction,
    output_format: {
      description: "Output pure JSON only. No comments, no markdown, no code blocks. Start with { and end with }. Must be parseable by JSON.parse.",
      schema: {
        section_2: {
          type: "object",
          description: "Features section",
          properties: {
            features: {
              type: "array",
              description: "Array of 3–5 product features extracted from image",
              min_items: 3,
              max_items: 5,
              items: {
                type: "object",
                properties: {
                  visual: {
                    type: "string",
                    description: FEATURE_RULES.visual,
                    example: "Water droplet with protective shield around it, showing waterproof protection"
                  },
                  text: {
                    type: "string",
                    description: FEATURE_RULES.text,
                    word_count: "2–5 words",
                    example: "Waterproof"
                  },
                  description: {
                    type: "string",
                    description: FEATURE_RULES.description,
                    word_count: "5–12 words",
                    example: "Survives splashes and rain"
                  }
                }
              }
            }
          }
        }
      },
      example: {
        section_2: {
          features: [
            { visual: "Water droplet with protective shield around it, showing waterproof protection", text: "Waterproof", description: "Survives splashes and rain" },
            { visual: "Battery icon with 24-hour clock overlay, showing full charge indicator", text: "24hr battery", description: "All-day power without charging" },
            { visual: "Shield with durability badge, showing reinforced structure", text: "Durable build", description: "Built to last through daily use" }
          ]
        }
      }
    }
  };
  
  return JSON.stringify(prompt, null, 2);
}

// Creative prompt constants
const CREATIVE_REQUIREMENTS = {
  panelStructure: `Section 1 MUST be ${PANEL_FORMATS.SQR.description} (${PANEL_FORMATS.SQR.ratio} ratio). Sections 2 and 3 MUST be combined in ${PANEL_FORMATS.WIDE.description} (${PANEL_FORMATS.WIDE.ratio} ratio, stacked vertically).`,
  unifiedBranding: "One accent color, one font pair across all 3 sections.",
  continuousBackground: `${BACKGROUND_MOTIF_DESCRIPTION}. Sections 2+3 continue it—same flow, creatively evolved (e.g. gradient deepens, pattern extends).`,
  productConsistency: "Same shape, colors, packaging. Vary POV/zoom per section.",
  section2Distinct: `Not a repeat of section 1. Choose one: ${SECTION_2_PRODUCT_TREATMENTS}. Surprise the viewer.`,
  useExactCopy: "Use exact ad copy below. tag.visible=false when tag is empty.",
} as const;

const SECTION_3_REQUIREMENTS = {
  product: `Creative representation—${SECTION_3_PRODUCT_TREATMENTS}. Surprise the viewer.`,
  cta: "Most clickable element. 24–32px, bold, high-contrast, glow/shadow. Pill or rounded-rect.",
  price: "20–26px, bold, clear badge. Never tiny.",
} as const;

/** Builds the full creative prompt that outputs ALL 3 sections in one call. */
export function buildFullCreativePrompt(copy: {
  headline: string;
  subheadline: string;
  tag: string;
  features: FeatureItem[];
  section3Headline: string;
  section3Subheadline: string;
  cta: string;
  price?: string;
  shopName?: string;
}): string {
  const adCopy = {
    section_1: { headline: copy.headline, subheadline: copy.subheadline, tag: copy.tag },
    section_2: { features: copy.features },
    section_3: { headline: copy.section3Headline, subheadline: copy.section3Subheadline, cta: copy.cta, price: copy.price ?? "", shopName: copy.shopName },
  };

  const prompt = {
    role: "Creative director for a 3-section landing page. Output a visual spec. One canvas when stacked—no dividers, seamless flow.",
    must_non_negotiable: {
      panel_structure: {
        description: CREATIVE_REQUIREMENTS.panelStructure,
        required: true
      },
      unified_branding: {
        description: CREATIVE_REQUIREMENTS.unifiedBranding,
        required: true
      },
      continuous_background: {
        description: CREATIVE_REQUIREMENTS.continuousBackground,
        required: true
      },
      product: {
        description: CREATIVE_REQUIREMENTS.productConsistency,
        required: true
      },
      section_2_distinct: {
        description: CREATIVE_REQUIREMENTS.section2Distinct,
        required: true
      },
      use_exact_copy: {
        description: CREATIVE_REQUIREMENTS.useExactCopy,
        required: true
      }
    },
    ad_copy: adCopy,
    section_3_conversion_focus: {
      product: {
        description: SECTION_3_REQUIREMENTS.product,
        required: true
      },
      cta: {
        description: SECTION_3_REQUIREMENTS.cta,
        required: true
      },
      price: {
        description: SECTION_3_REQUIREMENTS.price,
        required: true
      }
    },
    creative_freedom: {
      theme: "accentColor (from product), font_headline, font_body, lighting, aesthetic",
      positions_zoom_treatment_layout: "your choice",
      bold_accent_placement_pop_effects: "your choice"
    },
    output_format: {
      background_motif: {
        type: "string",
        description: BACKGROUND_MOTIF_DESCRIPTION,
        required: true
      },
      theme: {
        type: "object",
        description: "Theme settings derived from product",
        properties: {
          accentColor: {
            type: "string",
            description: "Accent color extracted from product",
            required: true
          },
          font_headline: {
            type: "string",
            description: "Font family for headlines",
            required: true
          },
          font_body: {
            type: "string",
            description: "Font family for body text",
            required: true
          },
          lighting: {
            type: "string",
            description: "Lighting style/approach",
            required: true
          },
          aesthetic: {
            type: "string",
            description: "Overall aesthetic style",
            required: true
          }
        }
      },
      global_directive: {
        type: "object",
        description: "Global design directives for consistency across all sections",
        properties: {
          vibe: {
            type: "string",
            description: "Descriptive aesthetic name (e.g., 'Urban Streetwear Chic', 'Luxurious Islamic Elegance', 'Modern Minimalist')",
            required: true
          },
          color_palette: {
            type: "object",
            description: "Color palette for the entire landing page",
            properties: {
              cta_hex: {
                type: "string",
                description: "Hex color for CTA buttons",
                format: "hex color",
                required: true
              },
              accent_hex: {
                type: "string",
                description: "Hex color for accents",
                format: "hex color",
                required: true
              },
              background_hex: {
                type: "string",
                description: "Hex color for background",
                format: "hex color",
                required: true
              },
              primary_text_hex: {
                type: "string",
                description: "Hex color for primary text",
                format: "hex color",
                required: true
              }
            }
          },
          typography_guide: {
            type: "string",
            description: "Specific font recommendations with usage notes (e.g., 'Headline: Bebas Neue (Bold), Body: Montserrat (Clean)')",
            required: true
          },
          continuity_directives: {
            type: "array",
            description: "Visual elements that create continuity across panels",
            items: {
              type: "object",
              properties: {
                element_type: {
                  type: "string",
                  description: "Type of visual element: texture_overlay, geometric_motif, or pattern",
                  enum: ["texture_overlay", "geometric_motif", "pattern"]
                },
                placement_hint: {
                  type: "string",
                  description: "Where to place the element (e.g., 'Fading into corners', 'Bottom right corner')",
                  required: true
                },
                panel_variations: {
                  type: "object | null",
                  description: "How the element varies across panels",
                  properties: {
                    "1": { type: "string", description: "Variation for panel 1" },
                    "3": { type: "string", description: "Variation for panel 3" }
                  }
                },
                color_instruction: {
                  type: "string",
                  description: "Color with opacity (e.g., 'Silver #C0C0C0 at 5% opacity')",
                  required: true
                },
                visual_description: {
                  type: "string",
                  description: "Detailed description of the visual element",
                  required: true
                }
              }
            }
          },
          transition_directives: {
            type: "array",
            description: "Directives for transitions between panels",
            items: { type: "object" }
          },
          recurring_visual_elements: {
            type: "array",
            description: "List of recurring elements across panels",
            items: { type: "string" }
          },
          panel_indicator_description: {
            type: "string",
            description: "Description of panel indicators if any",
            required: false
          }
        }
      },
      section_1: {
        type: "object",
        description: "Hero section - Hook to grab attention with high-impact product",
        properties: {
          panel_goal: {
            type: "string",
            description: "Hook - grab attention with high-impact product",
            required: true
          },
          panel_size: {
            type: "string",
            description: "Panel size format",
            enum: ["SQR"],
            required: true
          },
          panel_number: {
            type: "number",
            description: "Panel number",
            enum: [1],
            required: true
          },
          accentColor: {
            type: "string",
            description: "Accent color matching theme",
            required: true
          },
          text_content: {
            type: "object",
            description: "All text content for section 1",
            properties: {
              headline: {
                type: "string",
                description: "Exact headline from ad copy",
                required: true
              },
              badge_text: {
                type: "string | null",
                description: "Exact tag or null (same as tag, can be more creative)",
                required: false
              },
              price_text: {
                type: "null",
                description: "Not used in section 1",
                required: false
              },
              sub_headline: {
                type: "string",
                description: "Exact subheadline from ad copy",
                required: true
              },
              additional_text: {
                type: "null",
                description: "Not used in section 1",
                required: false
              },
              cta_button_text: {
                type: "null",
                description: "Not used in section 1",
                required: false
              },
              text_styling_instructions: {
                type: "string",
                description: "Detailed styling instructions (e.g., 'Highlight key word with metallic glow effect. Use bold, condensed font.')",
                required: true
              }
            }
          },
          headline: {
            type: "object",
            description: "Headline styling and positioning",
            properties: {
              text: {
                type: "string",
                description: "Exact headline text",
                required: true
              },
              font_family: {
                type: "string",
                description: "Font family from theme",
                required: true
              },
              font_size: {
                type: "string",
                description: "Font size",
                required: true
              },
              position: {
                type: "string",
                description: "Position on canvas",
                required: true
              },
              has_bold: {
                type: "boolean",
                description: "Whether text has bold styling",
                required: true
              },
              bold_where: {
                type: "string",
                description: "Which words/parts are bold",
                required: true
              },
              has_accent: {
                type: "boolean",
                description: "Whether text has accent color",
                required: true
              },
              accent_where: {
                type: "string",
                description: "Which words/parts use accent color",
                required: true
              },
              pop_effect: {
                type: "string",
                description: "Pop effect styling (glow, shadow, etc)",
                required: true
              }
            }
          },
          subheadline: {
            type: "object",
            description: "Subheadline styling and positioning",
            properties: {
              text: {
                type: "string",
                description: "Exact subheadline text",
                required: true
              },
              font_family: {
                type: "string",
                description: "Font family from theme",
                required: true
              },
              font_size: {
                type: "string",
                description: "Readable font size",
                required: true
              },
              position: {
                type: "string",
                description: "Position on canvas",
                required: true
              },
              has_accent: {
                type: "boolean",
                description: "Whether text has accent color",
                required: true
              },
              accent_where: {
                type: "string",
                description: "Which words/parts use accent color",
                required: true
              }
            }
          },
          product: {
            type: "object",
            description: "Product image specifications",
            properties: {
              position: {
                type: "string",
                description: "Position on canvas",
                required: true
              },
              zoom: {
                type: "string",
                description: "Zoom level - biggest for hero section",
                enum: ["biggest"],
                required: true
              },
              treatment: {
                type: "string",
                description: "Visual treatment/style",
                required: true
              }
            }
          },
          tag: {
            type: "object",
            description: "Promotional tag/badge",
            properties: {
              text: {
                type: "string",
                description: "Exact tag text or empty string",
                required: true
              },
              visible: {
                type: "boolean",
                description: "Whether tag is visible (false when tag is empty)",
                required: true
              },
              position: {
                type: "string",
                description: "Position on canvas",
                required: true
              },
              style: {
                type: "string",
                description: "Tag styling",
                required: true
              }
            }
          },
          composition_notes: {
            type: "string",
            description: "Layout guidance (e.g., 'SQR format. Product focus center-right')",
            required: true
          },
          visual_prompt_english: {
            type: "string",
            description: "Detailed English description for image generation (camera angle, lighting, background, mood, product positioning)",
            required: true
          },
          requires_product_reference: {
            type: "boolean",
            description: "Whether product reference image is required",
            enum: [true],
            required: true
          },
          background: {
            type: "string",
            description: "Background motif reference",
            required: true
          }
        }
      },
      section_2: {
        type: "object",
        description: "Features section - Showcase technical features and benefits",
        properties: {
          panel_goal: {
            type: "string",
            description: "Interest - Showcase technical features and benefits",
            required: true
          },
          panel_size: {
            type: "string",
            description: "Panel size format",
            enum: ["WIDE"],
            required: true
          },
          panel_number: {
            type: "number",
            description: "Panel number",
            enum: [2],
            required: true
          },
          accentColor: {
            type: "string",
            description: "Accent color matching theme",
            required: true
          },
          text_content: {
            type: "object",
            description: "All text content for section 2",
            properties: {
              headline: {
                type: "string | null",
                description: "Section 2 headline or null",
                required: false
              },
              badge_text: {
                type: "null",
                description: "Not used in section 2",
                required: false
              },
              price_text: {
                type: "null",
                description: "Not used in section 2",
                required: false
              },
              sub_headline: {
                type: "string | null",
                description: "Section 2 subheadline or null",
                required: false
              },
              additional_text: {
                type: "array | null",
                description: "Additional text items (features, shop_info, offers)",
                items: {
                  type: "object",
                  properties: {
                    label: {
                      type: "string",
                      description: "Label type: feature, shop_info, or offer",
                      enum: ["feature", "shop_info", "offer"]
                    },
                    content: {
                      type: "string",
                      description: "Text content",
                      required: true
                    },
                    style_hint: {
                      type: "string | null",
                      description: "Optional styling hint",
                      required: false
                    }
                  }
                }
              },
              cta_button_text: {
                type: "null",
                description: "Not used in section 2",
                required: false
              },
              text_styling_instructions: {
                type: "string",
                description: "Styling instructions for features (e.g., 'Render feature list with descriptive visual graphics next to each feature')",
                required: true
              }
            }
          },
          features: {
            type: "object",
            description: "Product features display",
            properties: {
              visible: {
                type: "boolean",
                description: "Whether features are visible",
                enum: [true],
                required: true
              },
              items: {
                type: "array",
                description: "Array of feature items",
                  items: {
                    type: "object",
                    properties: {
                      visual: {
                        type: "string",
                        description: "Descriptive visual representation of the feature. 8–20 words describing a graphic, illustration, or visual element that represents the feature.",
                        required: true
                      },
                      text: {
                        type: "string",
                        description: "Exact feature text",
                        required: true
                      },
                      description: {
                        type: "string",
                        description: "Exact feature description",
                        required: true
                      }
                    }
                  }
              },
              position: {
                type: "string",
                description: "Position on canvas",
                required: true
              },
              font_family: {
                type: "string",
                description: "Font family from theme",
                required: true
              },
              font_size: {
                type: "string",
                description: "Readable font size",
                required: true
              },
              layout: {
                type: "string",
                description: "Layout style",
                required: true
              }
            }
          },
          product: {
            type: "object",
            description: `Product image specifications - MUST be creatively distinct from section 1. Choose: ${SECTION_2_PRODUCT_TREATMENTS}`,
            properties: {
              position: {
                type: "string",
                description: "Position on canvas",
                required: true
              },
              zoom: {
                type: "string",
                description: "Zoom level - macro/medium/wide, different from section 1",
                enum: ["macro", "medium", "wide"],
                required: true
              },
              treatment: {
                type: "string",
                description: `Creative treatment: ${SECTION_2_PRODUCT_TREATMENTS} - must feel fresh and distinct`,
                required: true
              },
              pov: {
                type: "string",
                description: "Point of view (e.g., side, three-quarter, from above, through-product)",
                required: true
              }
            }
          },
          composition_notes: {
            type: "string",
            description: "Layout guidance (e.g., 'WIDE format. Product centered')",
            required: true
          },
          visual_prompt_english: {
            type: "string",
            description: "Detailed English description for image generation",
            required: true
          },
          requires_product_reference: {
            type: "boolean",
            description: "Whether product reference image is required",
            enum: [true],
            required: true
          },
          background: {
            type: "string",
            description: "Background motif reference",
            required: true
          }
        }
      },
      section_3: {
        type: "object",
        description: "Conversion section - Drive purchase with price and CTA",
        properties: {
          panel_goal: {
            type: "string",
            description: "Action - Drive purchase with price and CTA",
            required: true
          },
          panel_size: {
            type: "string",
            description: "Panel size format",
            enum: ["WIDE"],
            required: true
          },
          panel_number: {
            type: "number",
            description: "Panel number",
            enum: [3],
            required: true
          },
          accentColor: {
            type: "string",
            description: "Accent color matching theme",
            required: true
          },
          text_content: {
            type: "object",
            description: "All text content for section 3",
            properties: {
              headline: {
                type: "string",
                description: "Exact headline from ad copy",
                required: true
              },
              badge_text: {
                type: "null",
                description: "Not used in section 3",
                required: false
              },
              price_text: {
                type: "string",
                description: "Exact price text",
                required: true
              },
              sub_headline: {
                type: "string | null",
                description: "Exact subheadline or null",
                required: false
              },
              additional_text: {
                type: "array | null",
                description: "Additional text (shop_info, offers)",
                items: {
                  type: "object",
                  properties: {
                    label: {
                      type: "string",
                      description: "Label type: shop_info or offer",
                      enum: ["shop_info", "offer"]
                    },
                    content: {
                      type: "string",
                      description: "Shop name or offer text",
                      required: true
                    },
                    style_hint: {
                      type: "null",
                      description: "Not used",
                      required: false
                    }
                  }
                }
              },
              cta_button_text: {
                type: "string",
                description: "Exact CTA button text",
                required: true
              },
              text_styling_instructions: {
                type: "string",
                description: "Styling instructions (e.g., 'Place price in bold navy box with white text. Make CTA button sleek metallic pill-shaped.')",
                required: true
              }
            }
          },
          headline: {
            type: "object",
            description: "Headline styling and positioning",
            properties: {
              text: {
                type: "string",
                description: "Exact headline text",
                required: true
              },
              font_family: {
                type: "string",
                description: "Font family from theme",
                required: true
              },
              font_size: {
                type: "string",
                description: "Large font size",
                required: true
              },
              position: {
                type: "string",
                description: "Position on canvas",
                required: true
              },
              has_bold: {
                type: "boolean",
                description: "Whether text has bold styling",
                required: true
              },
              bold_where: {
                type: "string",
                description: "Which words/parts are bold",
                required: true
              },
              has_accent: {
                type: "boolean",
                description: "Whether text has accent color",
                required: true
              },
              accent_where: {
                type: "string",
                description: "Which words/parts use accent color",
                required: true
              }
            }
          },
          subheadline: {
            type: "object",
            description: "Subheadline styling and positioning",
            properties: {
              text: {
                type: "string",
                description: "Exact subheadline text",
                required: true
              },
              font_family: {
                type: "string",
                description: "Font family from theme",
                required: true
              },
              font_size: {
                type: "string",
                description: "Font size 12-16px",
                required: true
              },
              position: {
                type: "string",
                description: "Position on canvas",
                required: true
              }
            }
          },
          product: {
            type: "object",
            description: `Product image specifications - Creative, conversion-focused: ${SECTION_3_PRODUCT_TREATMENTS}—surprise the viewer`,
            properties: {
              position: {
                type: "string",
                description: "Position on canvas",
                required: true
              },
              zoom: {
                type: "string",
                description: "Zoom level",
                required: true
              },
              treatment: {
                type: "string",
                description: `Creative, conversion-focused treatment: ${SECTION_3_PRODUCT_TREATMENTS}—surprise the viewer`,
                required: true
              }
            }
          },
          price: {
            type: "object",
            description: SECTION_3_REQUIREMENTS.price,
            properties: {
              text: {
                type: "string",
                description: "Exact price text",
                required: true
              },
              has_background: {
                type: "boolean",
                description: "Whether price has background",
                enum: [true],
                required: true
              },
              position: {
                type: "string",
                description: "Position on canvas",
                required: true
              },
              style: {
                type: "string",
                description: "Style: 20-26px, bold, badge/pill",
                required: true
              }
            }
          },
          cta: {
            type: "object",
            description: SECTION_3_REQUIREMENTS.cta,
            properties: {
              text: {
                type: "string",
                description: "Exact CTA text",
                required: true
              },
              has_background: {
                type: "boolean",
                description: "Whether CTA has background",
                enum: [true],
                required: true
              },
              position: {
                type: "string",
                description: "Position on canvas",
                required: true
              },
              style: {
                type: "string",
                description: "Style: 24-32px, bold, high-contrast, irresistibly clickable",
                required: true
              }
            }
          },
          composition_notes: {
            type: "string",
            description: "Layout guidance (e.g., 'WIDE format. Product on right, price and CTA on left')",
            required: true
          },
          visual_prompt_english: {
            type: "string",
            description: "Detailed English description for image generation",
            required: true
          },
          requires_product_reference: {
            type: "boolean",
            description: "Whether product reference image is required",
            enum: [true],
            required: true
          },
          background: {
            type: "string",
            description: "Background motif reference",
            required: true
          }
        }
      }
    }
  };

  return JSON.stringify(prompt, null, 2);
}

// Image generation constants
const IMAGE_BASE_INSTRUCTIONS = "One canvas, no dividers. Product specs unchanged. Use only text from the spec. Follow visual_prompt_english and composition_notes when provided.";

export interface SectionCreativeSpec {
  panel_goal?: string;
  panel_size?: "SQR" | "WIDE";
  panel_number?: number;
  accentColor?: string;
  text_content?: {
    headline?: string;
    badge_text?: string | null;
    price_text?: string | null;
    sub_headline?: string | null;
    additional_text?: Array<{ label: string; content: string; style_hint?: string | null }> | null;
    cta_button_text?: string | null;
    text_styling_instructions?: string;
  };
  headline?: Record<string, unknown>;
  subheadline?: Record<string, unknown>;
  content?: Record<string, unknown>;
  product?: Record<string, unknown>;
  features?: Record<string, unknown>;
  tag?: Record<string, unknown>;
  cta?: Record<string, unknown>;
  price?: Record<string, unknown>;
  composition_notes?: string;
  visual_prompt_english?: string;
  requires_product_reference?: boolean;
  background?: string;
}

// Helper to get aspect ratio from panel size
function getAspectRatio(panelSize: string): string {
  return panelSize === "SQR" ? PANEL_FORMATS.SQR.ratio : PANEL_FORMATS.WIDE.ratio;
}

/** Image 1: section 1 only (hero). SQR format (1:1 ratio). */
export function buildImage1Prompt(section1: SectionCreativeSpec, backgroundMotif?: string): string {
  const panelSize = (section1 as { panel_size?: string })?.panel_size ?? "SQR";
  const aspectRatio = getAspectRatio(panelSize);
  
  const prompt = {
    role: "Landing page image generator",
    instructions: IMAGE_BASE_INSTRUCTIONS,
    image_number: "1/2",
    format: {
      panel_size: panelSize,
      aspect_ratio: aspectRatio,
      description: `${panelSize} format (${aspectRatio} aspect ratio)`
    },
    section: "Section 1 (hero) only",
    critical_requirements: [
      `Generate this image with ${aspectRatio} aspect ratio`,
      "One canvas, no dividers",
      "Product specs unchanged",
      "Use only text from the spec",
      "Follow visual_prompt_english and composition_notes when provided"
    ],
    background_motif: backgroundMotif || null,
    section_1: section1
  };
  
  return JSON.stringify(prompt, null, 2);
}

/** Image 2: sections 2+3 combined (WIDE format). Vertically stacked layout. */
export function buildImage2And3Prompt(
  section2: SectionCreativeSpec,
  section3: SectionCreativeSpec,
  backgroundMotif?: string
): string {
  const panelSize2 = (section2 as { panel_size?: string })?.panel_size ?? "WIDE";
  const panelSize3 = (section3 as { panel_size?: string })?.panel_size ?? "WIDE";
  const aspectRatio = getAspectRatio(panelSize2);
  
  const prompt = {
    role: "Landing page image generator",
    instructions: IMAGE_BASE_INSTRUCTIONS,
    image_number: "2/2",
    format: {
      panel_size: panelSize2,
      aspect_ratio: aspectRatio,
      description: `${panelSize2} format (${aspectRatio} aspect ratio)`
    },
    layout: {
      structure: "Sections 2 and 3 combined vertically stacked",
      top: "Section 2 (features)",
      bottom: "Section 3 (CTA)",
      canvas_style: "One seamless canvas, no dividers",
      branding: "Same branding, continuous background flow"
    },
    critical_requirements: [
      `Generate this image with ${aspectRatio} aspect ratio`,
      `Section 2 product shown in a DIFFERENT creative way—${SECTION_2_PRODUCT_TREATMENTS}. Never repeat section 1's product shot`,
      "One canvas, no dividers",
      "Product specs unchanged",
      "Use only text from the spec",
      "Follow visual_prompt_english and composition_notes when provided"
    ],
    background_motif: backgroundMotif || null,
    section_2: {
      ...section2,
      panel_size: panelSize2,
      note: `Top - features, ${panelSize2}`
    },
    section_3: {
      ...section3,
      panel_size: panelSize3,
      note: `Bottom - CTA, ${panelSize3}. Product: ${SECTION_3_PRODUCT_TREATMENTS}`
    }
  };
  
  return JSON.stringify(prompt, null, 2);
}

/** Full landing page: section 1 (SQR) + sections 2+3 (WIDE) combined. */
export function buildFullImagePrompt(
  fullCreative: { section_1: SectionCreativeSpec; section_2: SectionCreativeSpec; section_3: SectionCreativeSpec; background_motif?: string }
): string {
  const sqrFormat = `${PANEL_FORMATS.SQR.description} (${PANEL_FORMATS.SQR.ratio} aspect ratio)`;
  const wideFormat = `${PANEL_FORMATS.WIDE.description} (${PANEL_FORMATS.WIDE.ratio} aspect ratio, vertically stacked)`;
  
  const prompt = {
    role: "Landing page image generator",
    instructions: IMAGE_BASE_INSTRUCTIONS,
    structure: "FULL LANDING PAGE - Two-part structure",
    parts: {
      part_1: {
        section: "Section 1 (hero)",
        format: sqrFormat
      },
      part_2: {
        sections: "Sections 2+3 combined",
        format: wideFormat
      }
    },
    branding: "Same branding, continuous background flow",
    critical_requirements: [
      "One canvas, no dividers",
      "Product specs unchanged",
      "Use only text from the spec",
      "Follow visual_prompt_english and composition_notes when provided",
      `Section 2 product shown creatively distinct: ${SECTION_2_PRODUCT_TREATMENTS}`,
      `Section 3 product: ${SECTION_3_PRODUCT_TREATMENTS}`
    ],
    background_motif: fullCreative.background_motif || null,
    section_1: {
      ...fullCreative.section_1,
      note: `SQR - ${PANEL_FORMATS.SQR.ratio}, hero`
    },
    section_2: {
      ...fullCreative.section_2,
      note: `WIDE top - features. Product shown creatively distinct: ${SECTION_2_PRODUCT_TREATMENTS}`
    },
    section_3: {
      ...fullCreative.section_3,
      note: `WIDE bottom - CTA. Product: ${SECTION_3_PRODUCT_TREATMENTS}`
    }
  };
  
  return JSON.stringify(prompt, null, 2);
}
