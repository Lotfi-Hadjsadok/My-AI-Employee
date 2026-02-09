import sharp from "sharp";

const ALLOWED_ORIGINS = [
  "https://api.replicate.com/",
  "https://replicate.delivery/",
] as const;

async function fetchImageBuffer(url: string): Promise<Buffer> {
  if (!url || typeof url !== "string") {
    throw new Error("Invalid url");
  }
  
  // Handle proxied URLs
  let actualUrl = url;
  if (url.includes("/api/image-proxy?url=")) {
    const match = url.match(/\/api\/image-proxy\?url=([^&]+)/);
    if (match) {
      actualUrl = decodeURIComponent(match[1]);
    }
  }
  
  const allowed = ALLOWED_ORIGINS.some((o) => actualUrl.startsWith(o));
  if (!allowed) {
    throw new Error("Invalid url");
  }

  const headers: HeadersInit = {};
  if (actualUrl.startsWith("https://api.replicate.com/")) {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) throw new Error("Server config error");
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(actualUrl, { headers });
  if (!res.ok) throw new Error("Failed to fetch image");
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function mergeLandingSections(request: Request) {
  try {
    const body = await request.json();
    const img1 = body?.image1Url ?? body?.section1Url;
    const img2 = body?.image2Url ?? body?.section2Url;
    const img3 = body?.image3Url ?? body?.section3Url;

    const images: string[] = [];
    if (img1 && typeof img1 === "string") images.push(img1);
    if (img2 && typeof img2 === "string") images.push(img2);
    if (img3 && typeof img3 === "string") images.push(img3);

    if (images.length < 2) {
      return new Response(
        JSON.stringify({ error: "At least 2 image URLs required (image1Url, image2Url, optional image3Url)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const buffers = await Promise.all(images.map((url: string) => fetchImageBuffer(url)));

    const meta1 = await sharp(buffers[0]).metadata();
    const w = meta1.width ?? 512;
    
    // For 2:5 final ratio: if width = w, height = (w * 5) / 2 = 2.5w
    // Section 1: 1:1 ratio, height = w
    // Sections 2+3 combined: height = 2.5w - w = 1.5w
    const h1 = Math.round(w);        // Section 1: 1:1
    const h2 = Math.round(w * 1.5);  // Sections 2+3: 1.5w to achieve 2:5 final
    
    const resized1 = await sharp(buffers[0]).resize(w, h1, { fit: "cover" }).toBuffer();
    const resized2 = await sharp(buffers[1]).resize(w, h2, { fit: "cover" }).toBuffer();
    
    const composites = [
      { input: resized1, top: 0, left: 0 },
      { input: resized2, top: h1, left: 0 },
    ];

    const merged = await sharp({
      create: {
        width: w,
        height: h1 + h2, // Exactly 2.5w for perfect 2:5 ratio
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .composite(composites)
      .png()
      .toBuffer();

    return new Response(merged, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'attachment; filename="landing-full.png"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Merge failed";
    console.error("Landing merge error:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
