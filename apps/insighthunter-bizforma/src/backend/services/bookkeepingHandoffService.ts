import type { Env, FormationCase } from '../types';

export const bookkeepingHandoffService = {
  async onFormationComplete(env: Env, formation: FormationCase) {
    console.log('Formation complete; seeding CoA', formation.id);
  },
};
