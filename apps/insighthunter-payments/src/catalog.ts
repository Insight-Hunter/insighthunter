/**
 * Pricing catalog. Display prices here are for rendering on the marketing
 * site (/catalog endpoint) — Stripe Prices are the source of truth for what
 * actually gets charged. Each entry's `priceEnvKey` names the wrangler
 * secret/var holding the live Stripe Price ID, so price changes in Stripe
 * don't require a code deploy.
 *
 * Benchmarked to sit at/below QuickBooks Online (Simple Start ~$35,
 * Essentials ~$65, Plus ~$99/mo as of 2025 list pricing) and well below
 * Uplinq's bookkeeping-service pricing (~$250-1000+/mo) — verify current
 * competitor pricing before launch, list prices change.
 */

export type AccountTier = "startup" | "standard" | "pro";
export type ModuleAddon =
  | "payroll"
  | "pbx"
  | "insights_pro"
  | "bizforma_compliance";

export interface CatalogEntry {
  id: string;
  displayName: string;
  monthlyUsd: number; // 0 = free
  priceEnvKey: string; // wrangler var/secret name holding the Stripe Price ID
  includes: string[];
}

export const ACCOUNT_TIERS: Record<AccountTier, CatalogEntry> = {
  startup: {
    id: "startup",
    displayName: "Startup",
    monthlyUsd: 0,
    priceEnvKey: "", // free tier — no Stripe subscription needed
    includes: [
      "1 bank connection",
      "Up to 25 AI-categorized transactions/mo",
      "Basic dashboard",
      "Community support",
    ],
  },
  standard: {
    id: "standard",
    displayName: "Standard",
    monthlyUsd: 49,
    priceEnvKey: "STRIPE_PRICE_STANDARD",
    includes: [
      "Unlimited bookkeeping & bank connections",
      "Financial reports (P&L, balance sheet, cash flow)",
      "BizForma compliance reminders",
      "Basic AI insights",
      "Email support",
    ],
  },
  pro: {
    id: "pro",
    displayName: "Pro",
    monthlyUsd: 149,
    priceEnvKey: "STRIPE_PRICE_PRO",
    includes: [
      "Everything in Standard",
      "Full AI advisory & forecasting (Insights Pro)",
      "Priority support",
      "Eligible for Payroll & PBX add-ons",
    ],
  },
};

export const MODULE_ADDONS: Record<ModuleAddon, CatalogEntry> = {
  payroll: {
    id: "payroll",
    displayName: "Payroll",
    monthlyUsd: 40, // base + per-employee handled in Stripe as metered/tiered price
    priceEnvKey: "STRIPE_PRICE_PAYROLL",
    includes: ["White-label payroll processing", "Direct deposit", "Tax filing"],
  },
  pbx: {
    id: "pbx",
    displayName: "Business Phone (PBX)",
    monthlyUsd: 25,
    priceEnvKey: "STRIPE_PRICE_PBX",
    includes: ["Business phone number", "Voicemail & auto-messages", "SMS"],
  },
  insights_pro: {
    id: "insights_pro",
    displayName: "Insights Pro (add-on for Standard tier)",
    monthlyUsd: 30,
    priceEnvKey: "STRIPE_PRICE_INSIGHTS_PRO",
    includes: ["Full AI advisory on Standard tier without upgrading to Pro"],
  },
  bizforma_compliance: {
    id: "bizforma_compliance",
    displayName: "BizForma Ongoing Compliance",
    monthlyUsd: 20,
    priceEnvKey: "STRIPE_PRICE_BIZFORMA_COMPLIANCE",
    includes: ["Ongoing filing reminders", "Registered agent document handling"],
  },
};
