import { describe, expect, it } from "vitest";
import { isBalanced } from "../src/index.js";

describe("journal balance", () => {
  it("returns true for balanced entry", () => {
    expect(
      isBalanced({
        id: "j1",
        organizationId: "org1",
        lines: [
          { accountId: "cash", debit: 100, credit: 0 },
          { accountId: "revenue", debit: 0, credit: 100 },
        ],
      }),
    ).toBe(true);
  });
});
