import Replicate from "replicate";

function getClient(): Replicate {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not set in environment variables");
  return new Replicate({ auth: token });
}

async function extractImageUrl(raw: unknown): Promise<string> {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (typeof first === "string") return first;
  if (first instanceof URL) return first.href;
  // FileOutput in newer SDK versions has a url() method
  if (typeof (first as { url?: unknown }).url === "function") {
    const urlObj = await (first as { url: () => Promise<URL> | URL }).url();
    return urlObj instanceof URL ? urlObj.href : String(urlObj);
  }
  if (typeof (first as { url?: string }).url === "string") {
    return (first as { url: string }).url;
  }
  return String(first);
}

export async function run<T>(
  model: string,
  options: {
    prompt: string;
    images?: string[];
    response_mime_type?: string;
    modalities?: string[];
    max_tokens?: number;
  }
): Promise<T> {
  const { prompt, images = [], response_mime_type, modalities, max_tokens = 4096 } = options;
  const client = getClient();

  const isGoogle = model.startsWith("google/");

  if (modalities?.includes("image")) {
    const input: Record<string, unknown> = { prompt };
    if (images.length > 0) {
      if (isGoogle) input.images = images;
      else input.image = images[0];
    }
    if (isGoogle) input.max_output_tokens = max_tokens;

    const output = await client.run(model as `${string}/${string}`, { input });
    const url = await extractImageUrl(output);
    if (!url) throw new Error("Replicate image generation did not return an image URL");
    return url as T;
  }

  // Text / vision generation
  const systemPrefix =
    response_mime_type === "application/json"
      ? "Respond with valid JSON only. No markdown, no explanation, just the raw JSON object.\n\n"
      : "";

  const input: Record<string, unknown> = {
    prompt: `${systemPrefix}${prompt}`,
    ...(isGoogle ? { max_output_tokens: max_tokens } : { max_tokens }),
  };
  if (images.length > 0) {
    if (isGoogle) input.images = images;
    else input.image = images[0];
  }

  const output = await client.run(model as `${string}/${string}`, { input });
  const text = Array.isArray(output) ? (output as string[]).join("") : String(output ?? "");
  return text as T;
}

export function bufferToDataUrl(buffer: Buffer, mimeType = "image/jpeg"): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function runChatCompletion(
  model: string,
  input: { prompt: string; messages?: Array<{ role: string; content: string }> }
) {
  const client = getClient();
  const prompt = input.messages?.length
    ? input.messages.map((m) => m.content).join("\n")
    : input.prompt;

  const isGoogle = model.startsWith("google/");
  const body: Record<string, unknown> = {
    prompt,
    ...(isGoogle ? { max_output_tokens: 4096 } : { max_tokens: 4096 }),
  };
  const output = await client.run(model as `${string}/${string}`, { input: body });

  const text = Array.isArray(output) ? (output as string[]).join("") : String(output ?? "");
  return { output: text };
}
