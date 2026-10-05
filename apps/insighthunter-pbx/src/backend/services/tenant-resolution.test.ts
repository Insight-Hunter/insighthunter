// apps/insighthunter-pbx/src/services/tenant-resolution.test.ts
import { describe, expect, it } from "vitest";
import { resolveTenantForNumber } from "./tenant-resolution.js";

function fakeDb(mapping: Record<string, string>): D1Database {
  return {
    prepare(_sql: string) {
      let boundNumber: string | undefined;
      const stmt = {
        bind(...args: unknown[]) {
          boundNumber = String(args[0]);
          return stmt;
        },
        async first<T>() {
          const orgId = boundNumber ? mapping[boundNumber] : undefined;
          return (orgId ? { org_id: orgId } : null) as T | null;
        },
      };
      return stmt;
    },
  } as unknown as D1Database;
}

describe("resolveTenantForNumber", () => {
  it("resolves the tenant from the trusted number mapping, marked verified", async () => {
    const db = fakeDb({ "+15551234567": "org_abc" });
    const result = await resolveTenantForNumber(db, "+15551234567", "org_untrusted");
    expect(result).toEqual({ orgId: "org_abc", verified: true });
  });

  it("falls back to the unverified org query param when no mapping exists", async () => {
    const db = fakeDb({});
    const result = await resolveTenantForNumber(db, "+15559999999", "org_fallback");
    expect(result).toEqual({ orgId: "org_fallback", verified: false });
  });

  it("returns null when neither a mapping nor a fallback exists", async () => {
    const db = fakeDb({});
    const result = await resolveTenantForNumber(db, "+15559999999", null);
    expect(result).toBeNull();
  });
});
