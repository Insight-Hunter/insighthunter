import { describe, expect, it } from "vitest";
import { Percentage } from "../src/value-objects/Percentage.js";
describe("Percentage", () => {
  it("accepts bounded values", () => {
    expect(Percentage.create(25).value).toBe(25);
  });
});
//# sourceMappingURL=percentage.test.js.map
