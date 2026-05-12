import { describe, expect, it } from "vitest";
import { entityMatrix } from "../../data/entityMatrix";

describe("entityAdvisorService inputs", () => {
  it("includes LLC liability protection rule", () => {
    const rule = entityMatrix.find((item) => item.entityType === "llc" && item.factor === "liability_protection");
    expect(rule?.weight).toBe(5);
  });
});
