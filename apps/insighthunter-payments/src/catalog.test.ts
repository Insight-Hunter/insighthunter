// apps/insighthunter-payments/src/catalog.test.ts
import { describe, it, expect } from "vitest";
import { ACCOUNT_TIERS } from "./catalog.js";

describe("catalog pricing", () => {
  it("startup tier is free with no Stripe price key", () => {
    expect(ACCOUNT_TIERS.startup.monthlyUsd).toBe(0);
    expect(ACCOUNT_TIERS.startup.priceEnvKey).toBe("");
  });

  it("standard and pro tiers have a Stripe price env key", () => {
    expect(ACCOUNT_TIERS.standard.priceEnvKey).toBe("STRIPE_PRICE_STANDARD");
    expect(ACCOUNT_TIERS.pro.priceEnvKey).toBe("STRIPE_PRICE_PRO");
  });

  it("pro is priced above standard, standard above startup", () => {
    expect(ACCOUNT_TIERS.pro.monthlyUsd).toBeGreaterThan(ACCOUNT_TIERS.standard.monthlyUsd);
    expect(ACCOUNT_TIERS.standard.monthlyUsd).toBeGreaterThan(ACCOUNT_TIERS.startup.monthlyUsd);
  });

  it("every paid tier stays at or below QuickBooks Online list pricing", () => {
    expect(ACCOUNT_TIERS.standard.monthlyUsd).toBeLessThanOrEqual(65);
    expect(ACCOUNT_TIERS.pro.monthlyUsd).toBeLessThanOrEqual(150);
  });
});
