import type { EntityType } from '../types';

export function getTaxAccountChecklist(entityType: EntityType, state: string): string[] {
  const base = ['eftps'];

  if (entityType === 's_corp' || entityType === 'c_corp') {
    base.push('state_income');
  }
  if (['llc', 's_corp', 'c_corp'].includes(entityType)) {
    base.push('state_unemployment');
  }
  // States with sales tax registration
  const salesTaxStates = ['GA', 'TX', 'FL', 'CA', 'NY', 'WA', 'IL', 'PA'];
  if (salesTaxStates.includes(state)) {
    base.push('state_sales');
  }

  return base;
}
