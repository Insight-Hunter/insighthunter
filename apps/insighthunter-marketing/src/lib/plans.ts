import type { PlanId } from "../env.js";

export interface Plan {
  planId: PlanId;
  name: string;
  tagline: string;
  priceUsd: number;
  features: string[];
}

/**
 * Single source of truth for plan names/prices, consumed by both the
 * pricing page (src/pages/pricing.ts) and the JSON-LD structured data
 * (src/lib/seo.ts) so the two never drift out of sync.
 */
export const PLANS: readonly Plan[] = [
  {
    planId: "startup",
    name: "Lite",
    tagline: "For independent operators who want a clear financial starting point.",
    priceUsd: 0,
    features: [
      "Core bookkeeping and dashboard",
      "Cash-position snapshot",
      "One user seat",
      "Free forever",
    ],
  },
  {
    planId: "standard",
    name: "Standard",
    tagline: "For growing teams that need reporting and payroll in the operating rhythm.",
    priceUsd: 49,
    features: [
      "Everything in Lite",
      "Automated P&L and cash-flow reports",
      "Payroll tools",
      "Cash-flow forecasting",
      "Up to three user seats",
    ],
  },
  {
    planId: "pro",
    name: "Pro",
    tagline: "For full-service operations that need deeper visibility and connected workflows.",
    priceUsd: 149,
    features: [
      "Everything in Standard",
      "Full module access",
      "AI CFO assistance and advisory insights",
      "API and webhooks",
      "Priority support",
    ],
  },
];
