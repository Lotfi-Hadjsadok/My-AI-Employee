import stripJsonComments from "strip-json-comments";

export function parseJsonResponse<T>(text: string): T {
  let raw = text.trim().replace(/^\uFEFF/, "");
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) raw = codeBlockMatch[1].trim();
  else {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) raw = raw.slice(start, end + 1);
  }
  let parsed: T;
  try {
    parsed = JSON.parse(raw) as T;
  } catch {
    raw = stripJsonComments(raw);
    for (let prev = ""; prev !== raw; ) {
      prev = raw;
      raw = raw.replace(/,\s*([}\]])/g, "$1");
    }
    parsed = JSON.parse(raw) as T;
  }
  return parsed;
}

export function extractImageUrl(value: unknown): string | undefined {
  if (typeof value === "string" && (value.startsWith("http") || value.startsWith("data:"))) {
    return value;
  }
  if (value && typeof value === "object") {
    const u = (value as { url?: string }).url;
    if (typeof u === "string") return u;
  }
  return undefined;
}

export function parseProductFeatures(raw: string | undefined): string[] | undefined {
  if (!raw?.trim()) return undefined;
  const lines = raw
    .split(/[\n,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : undefined;
}

export const COPY_MODEL = "google/gemini-2.5-flash" as const;
/** Nano Banana Pro - Gemini 3 Pro Image Preview */
export const IMAGE_MODEL = "google/gemini-3-pro-image-preview" as const;

