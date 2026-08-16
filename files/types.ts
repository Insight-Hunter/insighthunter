export interface Env {
  DB: D1Database; // SAME physical D1 as insighthunter-auth
  STRIPE_SECRET_KEY: string; // secret
  STRIPE_WEBHOOK_SECRET: string; // secret
  AUTH_VERIFY_URL: string; // e.g. https://auth.insighthunter.app/session/verify
  ALLOWED_ORIGIN: string;
  APP_BASE_URL: string; // e.g. https://app.insighthunter.app

  // Stripe Price IDs, one var per catalog entry (see catalog.ts priceEnvKey)
  STRIPE_PRICE_STANDARD: string;
  STRIPE_PRICE_PRO: string;
  STRIPE_PRICE_PAYROLL: string;
  STRIPE_PRICE_PBX: string;
  STRIPE_PRICE_INSIGHTS_PRO: string;
  STRIPE_PRICE_BIZFORMA_COMPLIANCE: string;
}

export interface CheckoutRequest {
  type: "account_tier" | "module_addon";
  value: string; // e.g. "pro" or "payroll"
}

export interface SessionPayload {
  userId: string;
  email: string;
  tier: string;
  issuedAt: number;
  expiresAt: number;
}
