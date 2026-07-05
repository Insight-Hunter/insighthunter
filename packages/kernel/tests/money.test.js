import { describe, expect, it } from "vitest";
import { Currency } from "../src/value-objects/Currency.js";
import { Money } from "../src/value-objects/Money.js";
describe("Money", () => {
  it("adds same-currency values", () => {
    const usd = Currency.create("USD");
    const total = Money.create(10, usd).add(Money.create(5, usd));
    expect(total.amount).toBe(15);
  });
});
//# sourceMappingURL=money.test.js.map
