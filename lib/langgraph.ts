import { replicate } from "./replicate";

export async function runReplicateWorkflow(
  prompt: string,
  model: string = "meta/llama-3.1-8b-instruct",
  additionalInput: Record<string, unknown> = {}
) {
  const input = {
    prompt,
    ...additionalInput,
  };

  const output = await replicate.run(model as `${string}/${string}`, {
    input,
  });

  return {
    output,
    messages: [
      { content: prompt, type: "HumanMessage" },
      { content: JSON.stringify(output), type: "HumanMessage" },
    ],
  };
}
