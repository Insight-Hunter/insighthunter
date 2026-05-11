import { describe, expect, it } from "vitest";
import { buildStateChecklist, getStateRequirement } from "../../services/stateService";

describe("stateService", () => {
  it("returns Georgia requirement", () => {
    const result = getStateRequirement("GA");
    expect(result?.stateName).toBe("Georgia");
  });

  it("builds checklist with formation and annual steps", () => {
    const result = buildStateChecklist("GA", "llc");
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result[0]?.id).toBe("formation-filing");
  });
});
