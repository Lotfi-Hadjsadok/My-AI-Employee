import type { AdResult } from "./types";

export function safeRender(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

/** For copy display: show "(empty)" when value is missing or blank. */
export function copyDisplayValue(value: unknown): string {
  const s = safeRender(value);
  return typeof s === "string" && s.trim() === "" ? "(empty)" : s;
}

export function imageUrl(url: string | undefined | null): string {
  if (url == null || typeof url !== "string") return "";
  if (url.startsWith("data:")) return url;
  if (url.startsWith("https://replicate.delivery") || url.startsWith("https://api.replicate.com/"))
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  return url;
}

export function processFile(
  file: File,
  setImage: (v: string) => void,
  setError: (v: string | null) => void,
  setResult: (v: AdResult | null) => void
) {
  if (!file.type.startsWith("image/")) {
    setError("Please select an image file (JPEG, PNG, WebP)");
    return;
  }
  setError(null);
  setResult(null);
  const reader = new FileReader();
  reader.onload = () => setImage(reader.result as string);
  reader.readAsDataURL(file);
}
