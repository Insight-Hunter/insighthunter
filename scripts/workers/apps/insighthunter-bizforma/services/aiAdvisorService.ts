import type { Env } from '../types/env';
import { scoreEntities } from '../lib/scorer';

type NameInput = {
  businessConcept: string;
  industry: string;
  tone: string;
  state: string;
};

type EntityInput = {
  businessConcept: string;
  ownersCount: number;
  wantsLiabilityProtection: boolean;
  wantsOutsideInvestment: boolean;
  profitExpectation: string;
  payrollPlans: boolean;
};

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return match ? JSON.parse(match[0]) : null;
}

export async function generateBusinessNameSuggestions(env: Env, input: NameInput) {
  const prompt = `Generate 8 original US business name suggestions as JSON array with keys name, tagline, rationale. Business concept: ${input.businessConcept}. Industry: ${input.industry}. Tone: ${input.tone}. State: ${input.state}. Keep names short and brandable.`;
  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { prompt, max_tokens: 700 });
  const text = typeof response === 'string' ? response : (response.response ?? JSON.stringify(response));
  const parsed = extractJson(text);
  return Array.isArray(parsed) ? parsed : [];
}

export async function generateEntityRecommendation(env: Env, input: EntityInput) {
  const scored = scoreEntities({
    ownersCount: input.ownersCount,
    wantsLiabilityProtection: input.wantsLiabilityProtection,
    wantsOutsideInvestment: input.wantsOutsideInvestment,
    payrollPlans: input.payrollPlans,
  });
  const fallback = {
    recommendedEntity: scored[0]?.[0] || 'LLC',
    scoreSummary: scored.map(([name, score]) => `${name}:${score}`).join(', '),
    rationale: 'Fallback rule-based recommendation.',
    cautions: ['Validate with a tax professional before filing.'],
  };

  const prompt = `Return JSON object with keys recommendedEntity, scoreSummary, rationale, cautions. Recommend one of LLC, S-Corp, C-Corp, Sole Proprietorship, Partnership for this business: concept=${input.businessConcept}; owners=${input.ownersCount}; liability=${input.wantsLiabilityProtection}; outsideInvestment=${input.wantsOutsideInvestment}; profitExpectation=${input.profitExpectation}; payrollPlans=${input.payrollPlans}. Keep it concise and practical for a small business founder.`;
  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { prompt, max_tokens: 700 });
  const text = typeof response === 'string' ? response : (response.response ?? JSON.stringify(response));
  const parsed = extractJson(text);
  return parsed ?? fallback;
}
