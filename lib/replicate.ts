import Replicate from "replicate";

if (!process.env.REPLICATE_API_TOKEN) {
  throw new Error("REPLICATE_API_TOKEN is not set in environment variables");
}

const auth = process.env.REPLICATE_API_TOKEN as string;

export const replicate = new Replicate({ auth });
export const replicateRawUrls = new Replicate({ auth, useFileOutput: false });

type ReplicateModel = `${string}/${string}` | `${string}/${string}:${string}`;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err: unknown): boolean {
  const e = err as { status?: number; response?: { status?: number }; message?: string };
  const status = e?.status ?? e?.response?.status;
  const msg = String(e?.message ?? "").toLowerCase();
  if (status === 429 || status === 503) return true;
  if (msg.includes("e003") || msg.includes("unavailable due to high demand") || msg.includes("service is currently unavailable")) return true;
  return false;
}

export async function runWithRetry<T>(
  model: ReplicateModel,
  options: { input: Record<string, unknown> }
): Promise<T> {
  let lastError: unknown;
  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      if (attempt > 0) {
        const e = lastError as { response?: { headers?: { get?: (n: string) => string } }; retry_after?: string; message?: string };
        let retryAfter = e?.response?.headers?.get?.("retry-after") ?? e?.retry_after;
        if (!retryAfter && e?.message) {
          const m = e.message.match(/reset[s]?\s+in\s+~?(\d+)|"retry_after":\s*(\d+)/i);
          if (m) retryAfter = m[1] ?? m[2];
        }
        const waitMs = retryAfter ? parseInt(String(retryAfter), 10) * 1000 : 8000;
        await sleep(Math.max(waitMs, 5000));
      }
      const output = await replicateRawUrls.run(model, options);
      return output as T;
    } catch (err: unknown) {
      lastError = err;
      if (attempt < maxAttempts - 1 && isRetryableError(err)) continue;
      throw err;
    }
  }
  throw lastError;
}

export const RATE_LIMIT_DELAY_MS = 12_000;

export async function runReplicateModel(
  model: ReplicateModel,
  input: Record<string, unknown>
) {
  return replicate.run(model, { input });
}
