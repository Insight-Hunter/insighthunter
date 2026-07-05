import { describe, expect, it } from "vitest";
import { SystemClock } from "../src/services/Clock.js";
describe("SystemClock", () => {
  it("returns a date", () => {
    expect(new SystemClock().now()).toBeInstanceOf(Date);
  });
});
//# sourceMappingURL=clock.test.js.map
