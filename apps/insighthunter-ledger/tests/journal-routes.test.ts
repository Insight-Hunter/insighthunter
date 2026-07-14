import { describe, expect, it } from "vitest";
import ledgerApp from "../src/index";

describe("ledger journal routes", () => {
  it("validates balanced journals", async () => {
    const req = new Request("http://localhost/api/journals/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "j1",
        organizationId: "org1",
        lines: [
          { accountId: "cash", debit: 50, credit: 0 },
          { accountId: "revenue", debit: 0, credit: 50 },
        ],
      }),
    });
    const res = await ledgerApp.fetch(req);
    const json = await res.json();
    expect(json.balanced).toBe(true);
  });
});
