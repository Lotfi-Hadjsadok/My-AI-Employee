import { OpenRouter } from "@openrouter/sdk";

function getClient(): OpenRouter {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set in environment variables");
  return new OpenRouter({ apiKey: key });
}

function buildMessages(
  prompt: string,
  imageUrls: string[]
): Array<{ role: "user"; content: string | Array<{ type: "text"; text: string } | { type: "image_url"; imageUrl: { url: string } }> }> {
  if (imageUrls.length === 0) {
    return [{ role: "user" as const, content: prompt }];
  }
  const content: Array<{ type: "text"; text: string } | { type: "image_url"; imageUrl: { url: string } }> = [
    { type: "text", text: prompt },
  ];
  for (const url of imageUrls) {
    content.push({ type: "image_url", imageUrl: { url } });
  }
  return [{ role: "user", content }];
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
  const messages = buildMessages(prompt, images);

  const chatGenerationParams: {
    model: string;
    messages: ReturnType<typeof buildMessages>;
    maxTokens: number;
    responseFormat?: { type: "json_object" };
    modalities?: ("text" | "image")[];
  } = {
    model,
    messages,
    maxTokens: max_tokens,
  };
  if (response_mime_type) {
    chatGenerationParams.responseFormat = { type: "json_object" };
  }
  if (modalities?.length) {
    chatGenerationParams.modalities = modalities as ("text" | "image")[];
  }

  const response = await getClient().chat.send({
    chatGenerationParams: { ...chatGenerationParams, stream: false },
  });

  const msg = response.choices?.[0]?.message;
  if (!msg) throw new Error("OpenRouter returned no message");

  if (modalities?.includes("image")) {
    const images = msg.images;
    if (Array.isArray(images) && images.length > 0) {
      const url = images[0].imageUrl?.url;
      if (url) return url as T;
    }
    const content = msg.content;
    if (typeof content === "string" && (content.startsWith("http") || content.startsWith("data:"))) {
      return content as T;
    }
    if (Array.isArray(content)) {
      const imagePart = content.find(
        (p): p is { type: "image_url"; imageUrl: { url: string } } =>
          p && typeof p === "object" && "type" in p && p.type === "image_url" && "imageUrl" in p
      );
      if (imagePart?.imageUrl?.url) return imagePart.imageUrl.url as T;
    }
    throw new Error("OpenRouter image generation did not return image");
  }

  const text = typeof msg.content === "string" ? msg.content : Array.isArray(msg.content) ? msg.content.map((c) => (c.type === "text" ? c.text : "")).join("") : "";
  return text as T;
}

export function bufferToDataUrl(buffer: Buffer, mimeType = "image/jpeg"): string {
  const base64 = buffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

export async function runChatCompletion(
  model: string,
  input: { prompt: string; messages?: Array<{ role: string; content: string }> }
) {
  const messages: Array<{ role: "user"; content: string }> =
    input.messages?.map((m) => ({ role: "user" as const, content: m.content })) ??
    [{ role: "user", content: input.prompt }];

  const response = await getClient().chat.send({
    chatGenerationParams: {
      model,
      messages,
      maxTokens: 4096,
      stream: false,
    },
  });

  const content = response.choices?.[0]?.message?.content ?? "";
  const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((c) => (c.type === "text" ? c.text : "")).join("") : "";
  return { output: text };
}
