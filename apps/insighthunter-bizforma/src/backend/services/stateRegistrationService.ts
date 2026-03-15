import { getStateRules } from '../utils/stateRules';
import type { EntityType } from '../types';

export function getFilingSteps(entityType: EntityType, state: string): string[] {
  const rules = getStateRules(state, entityType === 'llc' ? 'articles_of_org' : 'articles_of_inc');
  return [
    `Choose a registered agent in ${state}`,
    `File ${rules.filingName} with the ${rules.agency}`,
    `Pay state filing fee: $${(rules.feeCents / 100).toFixed(2)}`,
    rules.publicationRequired ? 'Publish notice of formation (required in this state)' : null,
    `Obtain Certificate of Good Standing`,
    `Create Operating Agreement / Bylaws`,
  ].filter(Boolean) as string[];
}
