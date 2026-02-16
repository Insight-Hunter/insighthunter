// src/types/subscription.ts
export type PricingTier = 'starter' | 'professional' | 'enterprise';

export interface PricingPlan {
  id: string;
  name: string;
  tier: PricingTier;
  price: number;
  currency: string;
  billingPeriod: 'monthly' | 'yearly';
  features: string[];
  limits: {
    transactions: number;
    bankAccounts: number;
    users: number;
    storage: number; // GB
    aiReconciliations: number; // per month
  };
  stripePriceId: string;
}

export interface Subscription {
  id: string;
  userId: string;
  companyId: string;
  planId: string;
  tier: PricingTier;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsageMetrics {
  subscriptionId: string;
  period: string;
  transactions: number;
  bankAccounts: number;
  storage: number;
  aiReconciliations: number;
}
