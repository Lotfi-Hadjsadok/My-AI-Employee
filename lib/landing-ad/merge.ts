import sharp from "sharp";
import { replicate } from "../replicate";

const ALLOWED_ORIGINS = [
  "https://api.replicate.com/",
  "https://replicate.delivery/",
] as const;

async function fetchImageBuffer(url: string): Promise<Buffer> {
  if (!url || typeof url !== "string") {
    throw new Error("Invalid url");
  }
  const allowed = ALLOWED_ORIGINS.some((o) => url.startsWith(o));
  if (!allowed) {
    throw new Error("Invalid url");
  }

  const headers: HeadersInit = {};
  if (url.startsWith("https://api.replicate.com/")) {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) throw new Error("REPLICATE_API_TOKEN not set");
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error("Failed to fetch image");
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Merge two images vertically (image1 on top, image2 on bottom).
 * Final image has perfect 2:5 aspect ratio.
 * Image1 (Section 1) is 4:3, Image2 (Sections 2+3) is resized to fit 2:5 final ratio.
 * Returns Replicate file URL.
 */
export async function mergeImagesAndUpload(url1: string, url2: string): Promise<string> {
  const [buf1, buf2] = await Promise.all([
    fetchImageBuffer(url1),
    fetchImageBuffer(url2),
  ]);

  const meta1 = await sharp(buf1).metadata();
  const w = meta1.width ?? 512;
  
  // For 2:5 final ratio: if width = w, height = (w * 5) / 2 = 2.5w
  // Section 1: 4:3 ratio, height = (w * 3) / 4 = 0.75w
  // Sections 2+3 combined: height = 2.5w - 0.75w = 1.75w
  const h1 = Math.round((w * 3) / 4); // Section 1: 4:3
  const h2 = Math.round((w * 7) / 4); // Sections 2+3: 1.75w to achieve perfect 2:5 final

  const resized1 = await sharp(buf1).resize(w, h1, { fit: "cover" }).toBuffer();
  const resized2 = await sharp(buf2).resize(w, h2, { fit: "cover" }).toBuffer();

  const merged = await sharp({
    create: {
      width: w,
      height: h1 + h2, // Exactly 2.5w for perfect 2:5 ratio
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      { input: resized1, top: 0, left: 0 },
      { input: resized2, top: h1, left: 0 },
    ])
    .png()
    .toBuffer();

  const uploaded = await replicate.files.create(merged);
  return uploaded.urls.get;
}
