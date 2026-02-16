// src/backend/utils/pricing.ts
import { PricingPlan, PricingTier } from '@/types';

export const PRICING_PLANS: Record<PricingTier, PricingPlan[]> = {
  starter: [
    {
      id: 'starter-monthly',
      name: 'Starter',
      tier: 'starter',
      price: 29,
      currency: 'USD',
      billingPeriod: 'monthly',
      features: [
        'Up to 500 transactions/month',
        '2 bank account connections',
        'Basic financial reports',
        'Invoice management',
        'Email support',
        '5GB storage',
      ],
      limits: {
        transactions: 500,
        bankAccounts: 2,
        users: 1,
        storage: 5,
        aiReconciliations: 50,
      },
      stripePriceId: 'price_starter_monthly',
    },
    {
      id: 'starter-yearly',
      name: 'Starter',
      tier: 'starter',
      price: 290, // 2 months free
      currency: 'USD',
      billingPeriod: 'yearly',
      features: [
        'Up to 500 transactions/month',
        '2 bank account connections',
        'Basic financial reports',
        'Invoice management',
        'Email support',
        '5GB storage',
        '2 months free',
      ],
      limits: {
        transactions: 500,
        bankAccounts: 2,
        users: 1,
        storage: 5,
        aiReconciliations: 50,
      },
      stripePriceId: 'price_starter_yearly',
    },
  ],
  professional: [
    {
      id: 'professional-monthly',
      name: 'Professional',
      tier: 'professional',
      price: 79,
      currency: 'USD',
      billingPeriod: 'monthly',
      features: [
        'Unlimited transactions',
        '10 bank account connections',
        'Advanced financial reports',
        'AI-powered reconciliation',
        'Invoice & expense management',
        'QuickBooks integration',
        'Priority support',
        '50GB storage',
        'Multi-user access (up to 5)',
      ],
      limits: {
        transactions: -1, // unlimited
        bankAccounts: 10,
        users: 5,
        storage: 50,
        aiReconciliations: 500,
      },
      stripePriceId: 'price_professional_monthly',
    },
    {
      id: 'professional-yearly',
      name: 'Professional',
      tier: 'professional',
      price: 790,
      currency: 'USD',
      billingPeriod: 'yearly',
      features: [
        'Unlimited transactions',
        '10 bank account connections',
        'Advanced financial reports',
        'AI-powered reconciliation',
        'Invoice & expense management',
        'QuickBooks integration',
        'Priority support',
        '50GB storage',
        'Multi-user access (up to 5)',
        '2 months free',
      ],
      limits: {
        transactions: -1,
        bankAccounts: 10,
        users: 5,
        storage: 50,
        aiReconciliations: 500,
      },
      stripePriceId: 'price_professional_yearly',
    },
  ],
  enterprise: [
    {
      id: 'enterprise-monthly',
      name: 'Enterprise',
      tier: 'enterprise',
      price: 199,
      currency: 'USD',
      billingPeriod: 'monthly',
      features: [
        'Unlimited everything',
        'Unlimited bank connections',
        'Custom financial reports',
        'Unlimited AI reconciliation',
        'Full API access',
        'Dedicated account manager',
        'Custom integrations',
        'Unlimited storage',
        'Unlimited users',
        'SLA guarantee',
        'White-label option',
      ],
      limits: {
        transactions: -1,
        bankAccounts: -1,
        users: -1,
        storage: -1,
        aiReconciliations: -1,
      },
      stripePriceId: 'price_enterprise_monthly',
    },
    {
      id: 'enterprise-yearly',
      name: 'Enterprise',
      tier: 'enterprise',
      price: 1990,
      currency: 'USD',
      billingPeriod: 'yearly',
      features: [
        'Unlimited everything',
        'Unlimited bank connections',
        'Custom financial reports',
        'Unlimited AI reconciliation',
        'Full API access',
        'Dedicated account manager',
        'Custom integrations',
        'Unlimited storage',
        'Unlimited users',
        'SLA guarantee',
        'White-label option',
        '2 months free',
      ],
      limits: {
        transactions: -1,
        bankAccounts: -1,
        users: -1,
        storage: -1,
        aiReconciliations: -1,
      },
      stripePriceId: 'price_enterprise_yearly',
    },
  ],
};

export function getPlanById(planId: string): PricingPlan | null {
  for (const tier of Object.values(PRICING_PLANS)) {
    const plan = tier.find((p) => p.id === planId);
    if (plan) return plan;
  }
  return null;
}

export function checkLimit(
  subscription: { tier: PricingTier },
  metric: keyof PricingPlan['limits'],
  currentUsage: number
): { allowed: boolean; limit: number; usage: number } {
  const plan = PRICING_PLANS[subscription.tier][0]; // Get monthly plan
  const limit = plan.limits[metric];

  return {
    allowed: limit === -1 || currentUsage < limit,
    limit,
    usage: currentUsage,
  };
}
