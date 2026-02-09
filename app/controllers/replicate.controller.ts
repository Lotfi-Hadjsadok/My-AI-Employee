import { runReplicateWorkflow } from "@/lib/langgraph";

export async function createReplicate(body: {
  prompt: string;
  model?: string;
  input?: Record<string, unknown>;
}) {
  try {
    const { prompt, model, input } = body;

    const result = await runReplicateWorkflow(
      prompt,
      model || "meta/llama-3.1-8b-instruct",
      input || {}
    );

    return {
      success: true,
      output: result.output,
      messages: result.messages.map((msg: { content: unknown; type: string }) => ({
        content: msg.content,
        type: msg.type,
      })),
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Replicate API error:", error);
    return new Response(
      JSON.stringify({ error: err?.message || "An error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
