export const JSON_OUTPUT = `Output pure JSON only. No comments (no // or /* */). No markdown, code blocks, or surrounding text. Start with { and end with }. Output must be parseable by JSON.parse with no preprocessing.`;

export function outputBlock(schema: string) {
  return `## OUTPUT\n${JSON_OUTPUT}\n${schema}`;
}
