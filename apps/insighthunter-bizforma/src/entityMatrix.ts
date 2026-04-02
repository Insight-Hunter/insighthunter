// Entity scoring matrix — scores each answer against entity types

export type EntityType = 'SOLE_PROP' | 'LLC' | 'S_CORP' | 'C_CORP' | 'PARTNERSHIP' | 'NONPROFIT';

type ScoreMap = Partial<Record<EntityType, number>>;

interface MatrixRule {
  question: string;
  answers: Record<string, ScoreMap>;
}

export const ENTITY_MATRIX: MatrixRule[] = [
  {
    question: 'revenue_expect',
    answers: {
      under_50k:   { SOLE_PROP: 3, LLC: 2 },
      '50k_250k':  { LLC: 3, S_CORP: 2 },
      over_250k:   { S_CORP: 3, C_CORP: 2 },
    },
  },
  {
    question: 'team_size',
    answers: {
      just_me:      { SOLE_PROP: 3, LLC: 2 },
      small_team:   { LLC: 3, S_CORP: 2 },
      growing_fast: { C_CORP: 3, S_CORP: 2 },
    },
  },
  {
    question: 'liability_concern',
    answers: {
      high:   { LLC: 3, S_CORP: 3, C_CORP: 3 },
      medium: { LLC: 2, S_CORP: 2 },
      low:    { SOLE_PROP: 2 },
    },
  },
  {
    question: 'investor_funding',
    answers: {
      yes_vc:     { C_CORP: 5 },
      yes_angels: { C_CORP: 3, S_CORP: 2 },
      no:         { LLC: 2 },
    },
  },
];

export function scoreEntities(answers: Array<{ question: string; answer: string }>): Record<EntityType, number> {
  const scores: Record<EntityType, number> = {
    SOLE_PROP: 0, LLC: 0, S_CORP: 0, C_CORP: 0, PARTNERSHIP: 0, NONPROFIT: 0,
  };

  for (const { question, answer } of answers) {
    const rule = ENTITY_MATRIX.find(r => r.question === question);
    if (!rule) continue;
    const scoreMap = rule.answers[answer];
    if (!scoreMap) continue;
    for (const [entity, score] of Object.entries(scoreMap) as [EntityType, number][]) {
      scores[entity] += score;
    }
  }

  return scores;
}

export function recommendEntity(scores: Record<EntityType, number>): EntityType {
  return (Object.entries(scores) as [EntityType, number][])
    .sort(([, a], [, b]) => b - a)[0][0];
}
