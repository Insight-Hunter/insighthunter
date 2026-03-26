import type { Tier, TierLimits } from '@ih/types';

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: {
    transactions_per_month: 50,
    api_calls_per_minute: 20,
    ai_queries_per_day: 0,
    payroll_employees: 0,
    pbx_extensions: 0,
    storage_gb: 0.5,
    custom_worker: false,
    white_label: false,
    sla_hours: null,
  },
  lite: {
    transactions_per_month: null,
    api_calls_per_minute: 60,
    ai_queries_per_day: 10,
    payroll_employees: 0,
    pbx_extensions: 0,
    storage_gb: 5,
    custom_worker: false,
    white_label: false,
    sla_hours: null,
  },
  standard: {
    transactions_per_month: null,
    api_calls_per_minute: 120,
    ai_queries_per_day: 50,
    payroll_employees: 10,
    pbx_extensions: 5,
    storage_gb: 20,
    custom_worker: false,
    white_label: false,
    sla_hours: 48,
  },
  pro: {
    transactions_per_month: null,
    api_calls_per_minute: 300,
    ai_queries_per_day: 200,
    payroll_employees: 50,
    pbx_extensions: 25,
    storage_gb: 100,
    custom_worker: false,
    white_label: true,
    sla_hours: 24,
  },
  enterprise: {
    transactions_per_month: null,
    api_calls_per_minute: null,
    ai_queries_per_day: null,
    payroll_employees: null,
    pbx_extensions: null,
    storage_gb: null,
    custom_worker: true,
    white_label: true,
    sla_hours: 4,
  },
};

export const TIER_PRICING: Record<Tier, number> = {
  free: 0,
  lite: 29,
  standard: 79,
  pro: 199,
  enterprise: 999,
};

const TIER_ORDER: Tier[] = ['free', 'lite', 'standard', 'pro', 'enterprise'];

/**
 * Returns true if userTier rank is >= required rank.
 */
export function tierAtLeast(userTier: Tier, required: Tier): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(required);
}

/**
 * Returns false if the limit value is 0 or false (feature disabled).
 * Returns true if the limit is null (unlimited) or > 0.
 */
export function checkLimit(tier: Tier, key: keyof TierLimits): boolean {
  const val = TIER_LIMITS[tier][key];
  if (val === false || val === 0) return false;
  return true;
}
