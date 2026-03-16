interface ScoreResult {
  entityType: string;
  scoreBreakdown: { reason: string; weight: number }[];
}

export const entityMatrix = {
  score(answers: Record<string, unknown>): ScoreResult {
    return {
      entityType: 'LLC',
      scoreBreakdown: [
        { reason: 'Default entity type for small businesses', weight: 0.7 },
        { reason: 'Liability protection preferred', weight: 0.3 },
      ],
    };
  },
};
