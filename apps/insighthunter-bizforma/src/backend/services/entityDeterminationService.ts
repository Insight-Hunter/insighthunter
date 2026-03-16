import type { Env } from '../types';
import { entityMatrix } from '../utils/entityMatrix';

interface QuestionnaireInput {
  answers: Record<string, number | string | boolean>;
}

interface EntityRecommendation {
  entityType: string;
  confidence: number;
  rationale: string[];
}

export const entityDeterminationService = {
  async scoreAndRecommend(env: Env, input: QuestionnaireInput): Promise<EntityRecommendation> {
    const { entityType, scoreBreakdown } = entityMatrix.score(input.answers);

    return {
      entityType,
      confidence: 0.8,
      rationale: scoreBreakdown.map((b) => b.reason),
    };
  },
};
