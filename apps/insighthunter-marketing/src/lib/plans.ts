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
    name: "Scout",
    tagline: "For indie operators who need the core monitoring tools.",
    priceUsd: 0,
    features: [
      "Autonomous trend monitoring (1 market)",
      "Weekly digest email",
      "1 user seat",
      "30-day data history",
    ],
  },
  {
    planId: "standard",
    name: "Hunter",
    tagline: "For scaling companies that need automated alerts and predictive models.",
    priceUsd: 49,
    features: [
      "Everything in Scout",
      "Competitor anomaly alerts",
      "Predictive demand scopes",
      "5 user seats + roles",
      "Unlimited data history",
    ],
  },
  {
    planId: "pro",
    name: "Apex",
    tagline: "For enterprise operations that need full API access and dedicated nodes.",
    priceUsd: 149,
    features: [
      "Everything in Hunter",
      "Full API access",
      "Dedicated scanning nodes",
      "Unlimited user seats",
      "Priority support",
    ],
  },
];
