// AI Advisor Service — Workers AI powered business formation intelligence
// Uses @cf/meta/llama-3.1-8b-instruct for recommendations and name generation
// Results cached in KV with TTL to control compute costs

import type { BizformaEnv } from "../types.js";

const MODEL = "@cf/meta/llama-3.1-8b-instruct";
const CACHE_TTL = 60 * 60 * 6; // 6 hours

interface AiTextResult {
  response?: string;
}

function cacheKey(prefix: string, data: Record<string, unknown>): string {
  const sorted = Object.keys(data).sort().map((k) => `${k}=${data[k]}`).join("&");
  return `ai:${prefix}:${sorted}`;
}

export async function getEntityRecommendation(env: BizformaEnv, params: {
  state: string;
  business_type: string;
  owners: number;
  annual_revenue?: number;
  employees?: number;
  raise_investment?: boolean;
}): Promise<{ recommendation: string; rationale: string; pros: string[]; cons: string[] }> {
  const key = cacheKey("entity", params as Record<string, unknown>);
  const cached = await env.CACHE.get(key);
  if (cached) return JSON.parse(cached);

  const prompt = `You are a business formation advisor for small businesses in the United States.

A client wants to form a business with these details:
- State: ${params.state}
- Business type: ${params.business_type}
- Number of owners: ${params.owners}
- Estimated annual revenue: $${params.annual_revenue ?? 0}
- Employees: ${params.employees ?? 0}
- Plans to raise outside investment: ${params.raise_investment ? "Yes" : "No"}

Recommend the best entity type (LLC, S-Corp, C-Corp, Sole Proprietorship, or Partnership).
Respond ONLY as valid JSON with keys: recommendation (string), rationale (string, 2 sentences max), pros (array of 3 strings), cons (array of 3 strings).
Do not include markdown or explanation outside the JSON.`;

  const result = await env.AI.run(MODEL, {
    prompt,
    max_tokens: 400,
  }) as AiTextResult;

  try {
    const parsed = JSON.parse(result.response ?? "{}");
    await env.CACHE.put(key, JSON.stringify(parsed), { expirationTtl: CACHE_TTL });
    return parsed;
  } catch {
    // Fallback deterministic logic if AI parse fails
    const fallback = buildFallbackRecommendation(params);
    return fallback;
  }
}

export async function getNameSuggestions(env: BizformaEnv, params: {
  keywords: string[];
  state: string;
  entity_type: string;
  industry?: string;
}): Promise<{ suggestions: string[]; tips: string[] }> {
  const key = cacheKey("names", { ...params, keywords: params.keywords.sort().join(",") });
  const cached = await env.CACHE.get(key);
  if (cached) return JSON.parse(cached);

  const prompt = `You are helping a small business owner name their new ${params.entity_type} in ${params.state}.

Keywords they want to convey: ${params.keywords.join(", ")}
Industry: ${params.industry ?? "general business"}

Generate 5 creative, available-sounding business names. Each name should be memorable, professional, and appropriate for a ${params.entity_type}.
Also provide 3 tips for checking name availability in ${params.state}.

Respond ONLY as valid JSON with keys: suggestions (array of 5 strings, just the name without entity suffix), tips (array of 3 strings).
Do not include markdown or explanation outside the JSON.`;

  const result = await env.AI.run(MODEL, {
    prompt,
    max_tokens: 500,
  }) as AiTextResult;

  try {
    const parsed = JSON.parse(result.response ?? "{}");
    await env.CACHE.put(key, JSON.stringify(parsed), { expirationTtl: CACHE_TTL });
    return parsed;
  } catch {
    return buildFallbackNames(params);
  }
}

export async function getOperatingAgreementClauses(env: BizformaEnv, params: {
  entity_type: string;
  state: string;
  owners: number;
  business_name: string;
}): Promise<{ clauses: Array<{ section: string; content: string }> }> {
  const key = cacheKey("oa_clauses", params as Record<string, unknown>);
  const cached = await env.CACHE.get(key);
  if (cached) return JSON.parse(cached);

  const prompt = `Generate key clauses for a ${params.entity_type} Operating Agreement for "${params.business_name}" in ${params.state} with ${params.owners} owner(s).

Include these sections: Purpose, Management Structure, Capital Contributions, Profit Distribution, Voting Rights, Dissolution.
Keep each clause concise (2-3 sentences). Use plain English, not legalese.

Respond ONLY as valid JSON with key: clauses (array of objects with keys: section (string), content (string)).
Do not include markdown or explanation outside the JSON.`;

  const result = await env.AI.run(MODEL, {
    prompt,
    max_tokens: 800,
  }) as AiTextResult;

  try {
    const parsed = JSON.parse(result.response ?? "{}");
    await env.CACHE.put(key, JSON.stringify(parsed), { expirationTtl: CACHE_TTL });
    return parsed;
  } catch {
    return { clauses: [] };
  }
}

function buildFallbackRecommendation(params: {
  owners: number; annual_revenue?: number; raise_investment?: boolean;
}) {
  let rec = "LLC";
  if (params.raise_investment) rec = "C-CORP";
  else if (params.owners <= 5 && (params.annual_revenue ?? 0) > 80_000) rec = "S-CORP";

  return {
    recommendation: rec,
    rationale: `Based on ${params.owners} owner(s) and estimated revenue, a ${rec} offers the best balance of liability protection and tax efficiency.`,
    pros: ["Limited liability protection", "Pass-through taxation", "Flexible management structure"],
    cons: ["Annual filing requirements", "State fees apply", "May require registered agent"],
  };
}

function buildFallbackNames(params: { keywords: string[]; entity_type: string; state: string }) {
  const kw = params.keywords[0] ?? "Apex";
  return {
    suggestions: [
      `${kw} Ventures`, `${kw} Group`, `${kw} Solutions`,
      `${kw} Partners`, `${kw} Enterprises`,
    ],
    tips: [
      `Search the ${params.state} Secretary of State business name database online.`,
      "Check USPTO trademark database for conflicts at tmsearch.uspto.gov.",
      "Verify the .com domain is available before finalizing your name.",
    ],
  };
}
