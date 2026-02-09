import sharp from "sharp";

const ALLOWED_ORIGINS = [
  "https://api.replicate.com/",
  "https://replicate.delivery/",
] as const;

async function fetchImageBuffer(url: string): Promise<Buffer> {
  if (!url || typeof url !== "string") {
    throw new Error("Invalid url");
  }
  if (url.startsWith("data:")) {
    const base64Match = url.match(/^data:image\/[^;]+;base64,(.+)$/);
    if (!base64Match) throw new Error("Invalid data URL");
    return Buffer.from(base64Match[1], "base64");
  }
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
    const img2 = body?.section2Url;
    const img3 = body?.image3Url ?? body?.section3Url;

    const images: string[] = [];
    if (img1 && typeof img1 === "string") images.push(img1);
    if (img2 && typeof img2 === "string") images.push(img2);
    if (img3 && typeof img3 === "string") images.push(img3);

    if (images.length < 2) {
      return new Response(
        JSON.stringify({ error: "At least 2 image URLs required (image1Url/section1Url, section2Url, optional image3Url/section3Url)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const buffers = await Promise.all(images.map((url: string) => fetchImageBuffer(url)));

    // Get metadata for both images to ensure consistent width
    const meta1 = await sharp(buffers[0]).metadata();
    const meta2 = await sharp(buffers[1]).metadata();
    
    // Determine target width: use the maximum width of both images, or default to 1024 for high quality
    // This ensures both images are normalized to the same width
    const w1 = meta1.width ?? 1024;
    const w2 = meta2.width ?? 1024;
    const w = Math.max(w1, w2, 1024); // Use max width or minimum 1024px for quality
    
    // For 2:5 final ratio: if width = w, height = (w * 5) / 2 = 2.5w
    // Section 1: 1:1 ratio, height = w
    // Sections 2+3 combined: height = 2.5w - w = 1.5w
    const h1 = w; // Section 1: 1:1
    const h2 = Math.round((w * 3) / 2); // Sections 2+3: 1.5w to achieve 2:5 final
    
    // Extract bottom edge color from image1 for seamless background
    // Sample a small strip from the bottom to get the background color
    const img1Height = meta1.height ?? h1;
    const img1Width = meta1.width ?? w;
    const sampleHeight = Math.max(5, Math.floor(img1Height * 0.02));
    
    let seamlessBg = { r: 255, g: 255, b: 255 }; // fallback to white
    
    try {
      const bottomEdge = await sharp(buffers[0])
        .extract({
          left: 0,
          top: Math.max(0, img1Height - sampleHeight),
          width: img1Width,
          height: sampleHeight,
        })
        .resize(10, 1, { fit: "cover" })
        .raw()
        .toBuffer();
      
      // Calculate average color from sampled pixels
      if (bottomEdge.length >= 30) { // 10 pixels * 3 channels
        let sumR = 0, sumG = 0, sumB = 0;
        const pixelCount = Math.floor(bottomEdge.length / 3);
        for (let i = 0; i < pixelCount; i++) {
          sumR += bottomEdge[i * 3] ?? 0;
          sumG += bottomEdge[i * 3 + 1] ?? 0;
          sumB += bottomEdge[i * 3 + 2] ?? 0;
        }
        seamlessBg = {
          r: Math.round(sumR / pixelCount),
          g: Math.round(sumG / pixelCount),
          b: Math.round(sumB / pixelCount),
        };
      }
    } catch (e) {
      // If extraction fails, use white as fallback
      console.warn("Could not extract edge color, using white:", e);
    }
    
    // Resize images using "cover" to fill dimensions without white padding
    // This ensures seamless connection without visible lines
    // Both images are normalized to the exact same width (w) for perfect alignment
    const resized1 = await sharp(buffers[0])
      .resize(w, h1, { 
        fit: "cover",
        position: "center"
      })
      .toBuffer();
    
    const resized2 = await sharp(buffers[1])
      .resize(w, h2, { 
        fit: "cover",
        position: "center"
      })
      .toBuffer();
    
    // Verify both resized images have the same width (safety check)
    const verify1 = await sharp(resized1).metadata();
    const verify2 = await sharp(resized2).metadata();
    if (verify1.width !== verify2.width || verify1.width !== w) {
      console.warn(`Width mismatch: img1=${verify1.width}, img2=${verify2.width}, target=${w}`);
    }
    
    // Create a seamless merge with edge blending
    // Use the extracted background color for seamless transition
    const composites = [
      { input: resized1, top: 0, left: 0 },
      { input: resized2, top: h1, left: 0 },
    ];

    const merged = await sharp({
      create: {
        width: w,
        height: h1 + h2, // Exactly 2.5w for perfect 2:5 ratio
        channels: 3,
        background: seamlessBg, // Use extracted color instead of white
      },
    })
      .composite(composites)
      .png()
      .toBuffer();

    return new Response(new Uint8Array(merged), {
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
