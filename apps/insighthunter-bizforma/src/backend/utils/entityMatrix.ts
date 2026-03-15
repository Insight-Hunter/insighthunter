import type { EntityType } from '../types';

// Scoring weights: question key → answer → entity type → score delta
export const ENTITY_MATRIX: Record<string, Record<string, Partial<Record<EntityType, number>>>> = {
  annual_revenue: {
    'under_50k':   { sole_prop: 3,  llc: 2 },
    '50k_250k':    { llc: 3, s_corp: 2 },
    '250k_1m':     { s_corp: 4, llc: 2 },
    'over_1m':     { s_corp: 3, c_corp: 4 },
  },
  liability_concern: {
    'low':         { sole_prop: 2 },
    'moderate':    { llc: 3 },
    'high':        { llc: 4, s_corp: 3 },
  },
  investors_planned: {
    'no':          { sole_prop: 1, llc: 2 },
    'yes_angels':  { c_corp: 3, s_corp: 1 },
    'yes_vc':      { c_corp: 5 },
  },
  employees_planned: {
    'none':        { sole_prop: 2, llc: 1 },
    '1_5':         { llc: 2, s_corp: 2 },
    'over_5':      { s_corp: 3, c_corp: 2 },
  },
  self_employment_tax_concern: {
    'yes':         { s_corp: 3 },
    'no':          { sole_prop: 2, llc: 1 },
  },
  co_founders: {
    'no':          { sole_prop: 2, llc: 1 },
    'yes':         { partnership: 2, llc: 2, c_corp: 1 },
  },
};
