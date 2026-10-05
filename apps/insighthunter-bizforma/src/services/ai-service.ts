import type { BizformaEnv } from "../types.js";

const SYSTEM_PROMPT = `You are BizForma AI, an expert business formation assistant.
You help small business owners choose the right entity structure, understand compliance
requirements, and navigate state-specific filing rules. Be concise, accurate, and
always recommend consulting a licensed attorney for final decisions.`;

export async function advise(
  env: BizformaEnv,
  input: { question: string; context?: Record<string, unknown> }
) {
  const contextStr = input.context ? `Business context: ${JSON.stringify(input.context)}\n\n` : "";
  const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `${contextStr}${input.question}` }
    ],
    max_tokens: 512
  });
  return (response as { response?: string }).response ?? "";
}

export async function recommendEntity(
  env: BizformaEnv,
  input: {
    description: string;
    state: string;
    owners: number;
    liability_concern: boolean;
    tax_preference?: string;
  }
) {
  const prompt = `A business owner needs entity formation advice.
Business description: ${input.description}
State: ${input.state}
Number of owners: ${input.owners ?? 1}
Liability concern: ${input.liability_concern ? "Yes" : "No"}
Tax preference: ${input.tax_preference ?? "not specified"}

Recommend the best entity type (LLC, S-Corp, C-Corp, Sole Proprietorship, or Partnership).
Respond with JSON: { "recommendation": "...", "reason": "...", "pros": [...], "cons": [...] }`;

  const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ],
    max_tokens: 400
  });

  const raw = (response as { response?: string }).response ?? "{}";
  try {
    return JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
  } catch {
    return { recommendation: raw };
  }
}
