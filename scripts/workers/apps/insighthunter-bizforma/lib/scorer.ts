export type EntityScoreInput = {
  ownersCount: number;
  wantsLiabilityProtection: boolean;
  wantsOutsideInvestment: boolean;
  payrollPlans: boolean;
};

export function scoreEntities(input: EntityScoreInput) {
  const scores = {
    LLC: 0,
    'S-Corp': 0,
    'C-Corp': 0,
    'Sole Proprietorship': 0,
    Partnership: 0,
  };

  if (input.wantsLiabilityProtection) {
    scores.LLC += 3;
    scores['S-Corp'] += 2;
    scores['C-Corp'] += 2;
  } else {
    scores['Sole Proprietorship'] += 2;
    scores.Partnership += 2;
  }

  if (input.wantsOutsideInvestment) scores['C-Corp'] += 4;
  if (input.ownersCount > 1) {
    scores.Partnership += 2;
    scores.LLC += 2;
  }
  if (input.payrollPlans) scores['S-Corp'] += 2;

  return Object.entries(scores).sort((a, b) => b[1] - a[1]);
}
