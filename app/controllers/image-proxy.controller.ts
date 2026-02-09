const ALLOWED_ORIGINS = [
  "https://api.replicate.com/",
  "https://replicate.delivery/",
] as const;

export async function getImageProxy(url: string) {
  if (!url || typeof url !== "string") {
    return new Response(JSON.stringify({ error: "Invalid url" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const allowed = ALLOWED_ORIGINS.some((o) => url.startsWith(o));
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Invalid url" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers: HeadersInit = {};
  if (url.startsWith("https://api.replicate.com/")) {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return new Response(JSON.stringify({ error: "Server config error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: "Failed to fetch image" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const buffer = await res.arrayBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
