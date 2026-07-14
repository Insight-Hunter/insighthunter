import { describe, expect, it } from "vitest";
import { DateRange } from "../src/value-objects/DateRange.js";
describe("DateRange", () => {
  it("includes dates within range", () => {
    const range = DateRange.create(new Date("2026-01-01"), new Date("2026-12-31"));
    expect(range.includes(new Date("2026-06-01"))).toBe(true);
  });
});
//# sourceMappingURL=date-range.test.js.map
