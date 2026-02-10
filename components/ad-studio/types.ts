import { Image, Globe, Sparkles, LayoutGrid, Type, Award, List, MousePointerClick, MessageSquare } from "lucide-react";

export const AD_TYPES = [
  { value: "static", label: "Static ad", description: "Single image for feed or stories" },
  { value: "landing", label: "Landing page", description: "Full-page ad with copy sections" },
] as const;

export type PipelineStage =
  | "idle"
  | "copy"
  | "creative"
  | "generating"
  | "done"
  | "error";

export interface AdResult {
  inputImage: string;
  copyOutput?: {
    headline: string;
    subheadline: string;
    cta: string;
    price?: string;
    section3Headline?: string;
    section3Subheadline?: string;
    features?: Array<{ visual?: string; icon?: string; text: string; description?: string } | string>;
  };
  creativeOutput?: {
    accentColor: string;
    headline: {
      font_family: string;
      font_size: string;
      position: string;
      has_bold: boolean;
      bold_where?: string;
      has_accent: boolean;
      accent_where?: string;
    };
    subheadline: {
      visible: boolean;
      font_family: string;
      font_size: string;
      position: string;
      has_bold: boolean;
      bold_where?: string;
      has_accent: boolean;
      accent_where?: string;
    };
    product: {
      reversed?: boolean;
      position: string;
      zoom: string;
      rotation?: string;
      focus?: string;
      treatment?: string;
    };
    background: string;
    cta: {
      has_background: boolean;
      is_chip: boolean;
      position: string;
      style: string;
    };
    price: {
      has_background: boolean;
      is_chip: boolean;
      position: string;
      style: string;
    };
    effects: string;
  };
  generatedImageUrl?: string;
  refinedImageUrl?: string;
  image1Url?: string;
  image3Url?: string;
  imageUrl?: string;
}

export const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 Square" },
  { value: "4:5", label: "4:5 (Instagram)" },
  { value: "9:16", label: "9:16 (Stories)" },
  { value: "16:9", label: "16:9 (Landscape)" },
  { value: "landing", label: "Landing page" },
] as const;

/** Static ad only; used after user chooses "Static ad" type. */
export const STATIC_ASPECT_RATIOS = ASPECT_RATIOS.filter((r) => r.value !== "landing");

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "ar", label: "Arabic" },
] as const;

export const ARABIC_DIALECTS = [
  { value: "algerian", label: "Algerian (Darija)" },
  { value: "tunisian", label: "Tunisian (Darija)" },
  { value: "moroccan", label: "Moroccan (Darija)" },
] as const;

export const CURRENCIES = [
  { value: "EUR", label: "Euro" },
  { value: "USD", label: "USD" },
  { value: "DZD", label: "DZD" },
] as const;

export const FORM_STEPS = [
  { id: 1, title: "Type", subtitle: "Static ad or landing page", icon: LayoutGrid },
  { id: 2, title: "Format", subtitle: "Aspect ratio", icon: Globe },
  { id: 3, title: "Product & basics", subtitle: "Image, price & language", icon: Image },
  { id: 4, title: "Generate", subtitle: "Create your ad", icon: Sparkles },
] as const;

/** Static ad flow: Format → Language → Product (image, price) → copy steps → Generate (9 steps). */
export const FORM_STEPS_STATIC = [
  { id: 1, title: "Type", subtitle: "Static ad or landing page", icon: LayoutGrid },
  { id: 2, title: "Format", subtitle: "Aspect ratio", icon: Globe },
  { id: 3, title: "Language", subtitle: "Copy language", icon: Globe },
  { id: 4, title: "Product & basics", subtitle: "Image & price", icon: Image },
  { id: 5, title: "Hero", subtitle: "Headline", icon: Type },
  { id: 6, title: "Badges", subtitle: "Labels & tags", icon: Award },
  { id: 7, title: "Body", subtitle: "Subheadline, CTA & price", icon: MessageSquare },
  { id: 8, title: "Features", subtitle: "Additional text & list", icon: List },
  { id: 9, title: "Generate", subtitle: "Create your ad", icon: Sparkles },
] as const;

/** Editable draft copy for static ad (matches CopyOutput from static-ad). */
export interface StaticDraftCopyOutput {
  headline: string;
  /** @deprecated use badges; single badge for API compat */
  badge_text?: string | null;
  /** Multiple badge labels (e.g. "New", "Sale") */
  badges?: string[];
  subheadline: string;
  cta: string;
  price?: string;
  additional_text?: Array<{ label: string; content: string }> | null;
  features?: string[];
}

export const STAGES: { key: PipelineStage; label: string }[] = [
  { key: "copy", label: "Copy" },
  { key: "creative", label: "Creative" },
  { key: "generating", label: "Image" },
];

export type PromptLogEntry = { step: string; label: string; prompt: string; output?: string };

/** Editable draft copy from copy_agent (landing flow). User edits then approves → creative + image. */
export interface DraftCopyOutput {
  headline: string;
  subheadline: string;
  tag?: string;
  /** @deprecated use badges */
  badge_text?: string | null;
  /** Multiple badge labels */
  badges?: string[];
  cta: string;
  price?: string;
  section3Headline?: string;
  section3Subheadline?: string;
  shop_info?: string | null;
  features?: Array<{ visual?: string; text: string; description?: string }>;
}

/** Landing flow: Type → Image & price → multistep Review (Hero, Badges, Features, CTA) → Generate */
export const FORM_STEPS_LANDING = [
  { id: 1, title: "Type", subtitle: "Static ad or landing page", icon: LayoutGrid },
  { id: 2, title: "Image & price", subtitle: "Upload and basics", icon: Image },
  { id: 3, title: "Hero", subtitle: "Headline & subheadline", icon: Type },
  { id: 4, title: "Badges", subtitle: "Labels & tags", icon: Award },
  { id: 5, title: "Features", subtitle: "Feature list", icon: List },
  { id: 6, title: "CTA", subtitle: "Section headline, CTA & price", icon: MousePointerClick },
  { id: 7, title: "Generate", subtitle: "Create your ad", icon: Sparkles },
] as const;
