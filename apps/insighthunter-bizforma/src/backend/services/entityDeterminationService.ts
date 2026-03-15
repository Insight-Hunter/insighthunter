import type { EntityType, EntityRecommendation } from '../types';
import { ENTITY_MATRIX }                         from '../utils/entityMatrix';

export async function scoreEntity(
  answers: Record<string, string>,
  ai:      Ai,
): Promise<EntityRecommendation> {
  const scores: Record<EntityType, number> = {
    sole_prop:   0,
    llc:         0,
    s_corp:      0,
    c_corp:      0,
    partnership: 0,
  };

  // Rule-based scoring from matrix
  for (const [key, value] of Object.entries(answers)) {
    const weights = ENTITY_MATRIX[key]?.[value];
    if (weights) {
      for (const [entity, weight] of Object.entries(weights)) {
        scores[entity as EntityType] += weight;
      }
    }
  }

  // AI narrative reasoning
  const prompt = `
    A user answered the following business formation questions:
    ${Object.entries(answers).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
    Scores: ${JSON.stringify(scores)}
    Recommend the best entity type (sole_prop, llc, s_corp, c_corp, partnership) and explain why in 2-3 sentences.
    Also list any key warnings. Respond as JSON: { recommended, reasoning, warnings }
  `;

  const aiRes = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [{ role: 'user', content: prompt }],
  }) as { response: string };

  let aiData: any = {};
  try { aiData = JSON.parse(aiRes.response); } catch { /* fallback below */ }

  const recommended = aiData.recommended ?? (
    Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0] as EntityType
  );

  return {
    recommended,
    score:     scores,
    reasoning: aiData.reasoning ?? 'Based on your answers, this entity type best fits your needs.',
    warnings:  aiData.warnings  ?? [],
  };
}
