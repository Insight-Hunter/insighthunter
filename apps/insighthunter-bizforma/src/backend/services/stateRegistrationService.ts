import type { Env } from '../types';
import { stateRules } from '../utils/stateRules';

export const stateRegistrationService = {
  async getWizardConfig(env: Env, state: string) {
    const rules = stateRules[state] ?? stateRules.DEFAULT;
    return {
      state,
      filingFee: rules.filingFee,
      expectedTimelineDays: rules.timelineDays,
      steps: rules.steps,
    };
  },
};
