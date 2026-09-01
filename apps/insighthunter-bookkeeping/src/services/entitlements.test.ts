import { describe, expect, it } from "vitest";
import { canUseFeature, requireFeature, type Entitlement } from "./entitlements";

const now = new Date("2026-09-01T00:00:00.000Z");

function entitlement(overrides: Partial<Entitlement> = {}): Entitlement {
  return {
    tenantId: "tenant_0123456789abcdef",
    plan: "standard",
    status: "active",
    features: ["csv_import", "reconciliation"],
    currentPeriodEnd: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("bookkeeping entitlements", () => {
  it("allows an active entitlement with the requested feature", () => {
    expect(canUseFeature(entitlement(), "reconciliation", now)).toBe(true);
  });

  it("allows a trialing entitlement with the requested feature", () => {
    expect(
      canUseFeature(entitlement({ status: "trialing" }), "reconciliation", now),
    ).toBe(true);
  });

  it("denies expired billing periods", () => {
    expect(
      canUseFeature(
        entitlement({ currentPeriodEnd: "2026-08-31T23:59:59.000Z" }),
        "reconciliation",
        now,
      ),
    ).toBe(false);
  });

  it.each(["past_due", "unpaid", "canceled", "incomplete", "incomplete_expired"] as const)(
    "denies %s paid access",
    (status) => {
      expect(canUseFeature(entitlement({ status }), "reconciliation", now)).toBe(false);
    },
  );

  it("denies features absent from the entitlement", () => {
    expect(canUseFeature(entitlement(), "managed_bookkeeping", now)).toBe(false);
  });

  it("throws a non-cacheable 403 when a feature is unavailable", () => {
    try {
      requireFeature(entitlement(), "managed_bookkeeping", now);
      throw new Error("Expected requireFeature to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.status).toBe(403);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });
});
