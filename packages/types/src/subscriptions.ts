// packages/types/src/subscriptions.ts

export type Plan = 'lite' | 'standard' | 'pro';
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing';

export interface PlanLimit {
  clients: number;          // Infinity for pro
  autoIngest: boolean;
  engagementLetters: boolean;
  insightPacks: boolean;
  whiteLabel: boolean;
  priceMonthly: number;
  stripePriceId?: string;
}

export const PLAN_LIMITS: Record<Plan, PlanLimit> = {
  lite:     { clients: 3,        autoIngest: false, engagementLetters: false, insightPacks: false, whiteLabel: false, priceMonthly: 0   },
  standard: { clients: 20,       autoIngest: true,  engagementLetters: true,  insightPacks: true,  whiteLabel: false, priceMonthly: 49  },
  pro:      { clients: Infinity, autoIngest: true,  engagementLetters: true,  insightPacks: true,  whiteLabel: true,  priceMonthly: 149 },
};

export const PLAN_RANK: Record<Plan, number> = { lite: 0, standard: 1, pro: 2 };

export interface Subscription {
  userId: string;
  plan: Plan;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
}
