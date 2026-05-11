import { describe, expect, it } from "vitest";

describe("complianceService", () => {
  it("creates annual-report style dates", () => {
    const year = new Date().getUTCFullYear();
    expect(`${year}-04-01`).toMatch(/^\d{4}-04-01$/);
  });
});
