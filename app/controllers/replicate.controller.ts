import { runChatCompletion } from "@/lib/openrouter";

const REPLICATE_TO_OPENROUTER_MODEL: Record<string, string> = {
  "meta/llama-3.1-8b-instruct": "meta-llama/llama-3.1-8b-instruct",
};

export async function createReplicate(body: {
  prompt: string;
  model?: string;
  input?: Record<string, unknown>;
}) {
  try {
    const { prompt, model } = body;
    const openRouterModel = model ? REPLICATE_TO_OPENROUTER_MODEL[model] ?? model : "meta-llama/llama-3.1-8b-instruct";

    const { output } = await runChatCompletion(openRouterModel, { prompt });

    return {
      success: true,
      output,
      messages: [
        { content: prompt, type: "HumanMessage" },
        { content: JSON.stringify(output), type: "HumanMessage" },
      ],
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("OpenRouter API error:", error);
    return new Response(
      JSON.stringify({ error: err?.message || "An error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
