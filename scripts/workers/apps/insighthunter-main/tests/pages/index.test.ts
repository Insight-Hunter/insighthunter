import { describe, it, expect } from "vitest";
import { APPS } from "../../src/data/apps";
import { TIERS } from "../../src/data/pricing";

describe("data integrity", () => {
  it("all apps have a slug and route", () => {
    APPS.forEach((app) => {
      expect(app.slug).toBeTruthy();
      expect(app.route).toMatch(/^\//);
    });
  });

  it("tiers have valid monthly prices", () => {
    TIERS.filter((t) => t.id !== "white-label").forEach((t) => {
      expect(t.monthlyPrice).toBeGreaterThan(0);
      expect(t.annualPrice).toBeLessThanOrEqual(t.monthlyPrice);
    });
  });

  it("standard tier includes bookkeeping feature", () => {
    const standard = TIERS.find((t) => t.id === "standard")!;
    expect(standard.features).toContain("bookkeeping");
  });
});
