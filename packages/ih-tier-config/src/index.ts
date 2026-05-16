export type Tier = 'free' | 'lite' | 'standard' | 'pro' | 'enterprise';

export interface TierLimits {
  transactions_per_month: number | null;
  ai_queries_per_day: number | null;
  payroll_employees: number | null;
  pbx_extensions: number | null;
  custom_worker: boolean;
  white_label: boolean;
  sla_hours: number | null;
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: {
    transactions_per_month: 5,
    ai_queries_per_day: 0,
    payroll_employees: 0,
    pbx_extensions: 0,
    custom_worker: false,
    white_label: false,
    sla_hours: null,
  },
  lite: {
    transactions_per_month: 500,
    ai_queries_per_day: 5,
    payroll_employees: 0,
    pbx_extensions: 0,
    custom_worker: false,
    white_label: false,
    sla_hours: null,
  },
  standard: {
    transactions_per_month: 2000,
    ai_queries_per_day: 20,
    payroll_employees: 5,
    pbx_extensions: 3,
    custom_worker: false,
    white_label: false,
    sla_hours: null,
  },
  pro: {
    transactions_per_month: null,
    ai_queries_per_day: null,
    payroll_employees: null,
    pbx_extensions: null,
    custom_worker: false,
    white_label: false,
    sla_hours: 4,
  },
  enterprise: {
    transactions_per_month: null,
    ai_queries_per_day: null,
    payroll_employees: null,
    pbx_extensions: null,
    custom_worker: true,
    white_label: true,
    sla_hours: 1,
  },
};

export const TIER_PRICING: Record<Tier, number> = {
  free: 0,
  lite: 19,
  standard: 49,
  pro: 99,
  enterprise: 299,
};

export function tierAtLeast(userTier: Tier, required: Tier): boolean {
  const order: Tier[] = ['free', 'lite', 'standard', 'pro', 'enterprise'];
  return order.indexOf(userTier) >= order.indexOf(required);
}
