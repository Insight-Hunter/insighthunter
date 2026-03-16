import type { Env } from '../types';

interface ChecklistInput {
  state: string;
  entityType: string;
}

export const taxAccountService = {
  async buildChecklist(env: Env, input: ChecklistInput) {
    return [
      {
        id: 'eftps',
        label: 'Enroll in EFTPS',
        url: 'https://www.eftps.gov/eftps/',
        required: true,
      },
      {
        id: 'state_withholding',
        label: `Register for ${input.state} withholding (if employees)`,
        url: 'https://www.google.com/search?q=' + encodeURIComponent(`${input.state} withholding tax registration`),
        required: true,
      },
    ];
  },
};
