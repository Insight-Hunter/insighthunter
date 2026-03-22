// src/data/pricing.ts

export type TierSlug = 'lite' | 'standard' | 'pro';

export interface TierDefinition {
  slug: TierSlug;
  name: string;
  priceMonthly: number; // USD cents
  priceAnnual: number;  // USD cents per year
  stripePriceIdMonthly: string;
  stripePriceIdAnnual: string;
  maxUsers: number;
  description: string;
  cta: string;
}

export const TIERS: Record<TierSlug, TierDefinition> = {
  lite: {
    slug: 'lite',
    name: 'Insight Lite',
    priceMonthly: 0,
    priceAnnual: 0,
    stripePriceIdMonthly: '',
    stripePriceIdAnnual: '',
    maxUsers: 1,
    description: 'Core P&L and KPI visibility for solo operators.',
    cta: 'Get Started Free',
  },
  standard: {
    slug: 'standard',
    name: 'Insight Standard',
    priceMonthly: 2900, // $29/mo
    priceAnnual: 27900, // $279/yr
    stripePriceIdMonthly: 'price_standard_monthly',
    stripePriceIdAnnual: 'price_standard_annual',
    maxUsers: 5,
    description: 'Full reports, forecasting, and bookkeeping sync.',
    cta: 'Start Free Trial',
  },
  pro: {
    slug: 'pro',
    name: 'Insight Pro',
    priceMonthly: 9900, // $99/mo
    priceAnnual: 94900, // $949/yr
    stripePriceIdMonthly: 'price_pro_monthly',
    stripePriceIdAnnual: 'price_pro_annual',
    maxUsers: Infinity,
    description: 'AI CFO, white-label exports, and multi-client management.',
    cta: 'Go Pro',
  },
};

export const TIER_ORDER: TierSlug[] = ['lite', 'standard', 'pro'];

/** Returns true if userTier meets or exceeds requiredTier */
export function tierMeets(userTier: TierSlug, requiredTier: TierSlug): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(requiredTier);
}
