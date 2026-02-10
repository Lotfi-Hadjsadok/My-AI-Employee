import { OpenRouter } from "@openrouter/sdk";

function getClient(): OpenRouter {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set in environment variables");
  return new OpenRouter({ apiKey: key });
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
  const content =
    images.length === 0
      ? prompt
      : [{ type: "text" as const, text: prompt }, ...images.map((url) => ({ type: "image_url" as const, imageUrl: { url } }))];
  const messages = [{ role: "user" as const, content }];

  const response = await getClient().chat.send({
    chatGenerationParams: {
      model,
      messages,
      maxTokens: max_tokens,
      stream: false,
      ...(response_mime_type && { responseFormat: { type: "json_object" as const } }),
      ...(modalities?.length && { modalities: modalities as ("text" | "image")[] }),
    },
  });

  const msg = response.choices?.[0]?.message;
  if (!msg) throw new Error("OpenRouter returned no message");

  if (modalities?.includes("image")) {
    const img = msg.images?.[0] ?? msg.content;
    const o = img as { url?: string; imageUrl?: { url: string } };
    const url = typeof img === "string" ? img : o.url ?? o.imageUrl?.url;
    if (!url) throw new Error("OpenRouter image generation did not return image");
    return url as T;
  }

  const raw = msg.content;
  return (typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map((p) => (p as { text?: string }).text ?? "").join("") : "") as T;
}

export function bufferToDataUrl(buffer: Buffer, mimeType = "image/jpeg"): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function runChatCompletion(
  model: string,
  input: { prompt: string; messages?: Array<{ role: string; content: string }> }
) {
  const messages =
    input.messages?.length ?
      input.messages.map((m) => ({ role: "user" as const, content: m.content }))
    : [{ role: "user" as const, content: input.prompt }];

  const response = await getClient().chat.send({
    chatGenerationParams: { model, messages, maxTokens: 4096, stream: false },
  });

  const raw = response.choices?.[0]?.message?.content ?? "";
  const output = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map((p) => (p as { text?: string }).text ?? "").join("") : "";
  return { output };
}
