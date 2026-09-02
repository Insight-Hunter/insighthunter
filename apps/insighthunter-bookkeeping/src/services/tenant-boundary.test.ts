import { describe, expect, it } from "vitest";
import {
  requireTenantId,
  requireTenantMatch,
  requireTenantPrincipal,
  requireTenantRole,
  type TenantPrincipal,
} from "./tenant-boundary";

const principal: TenantPrincipal = {
  subject: "user_0123456789abcdef",
  tenantId: "tenant_0123456789abcdef",
  roles: ["owner"],
  sessionId: "session_0123456789abcdef",
};

describe("tenant boundary", () => {
  it("accepts a valid opaque tenant identifier", () => {
    expect(requireTenantId(principal.tenantId)).toBe(principal.tenantId);
  });

  it.each([undefined, null, "", "tenant", "tenant with spaces"])(
    "rejects invalid tenant identifiers",
    (tenantId) => {
      expect(() => requireTenantId(tenantId)).toThrow(Response);
    },
  );

  it("allows a resource owned by the authenticated tenant", () => {
    expect(() => requireTenantMatch(principal, { tenantId: principal.tenantId })).not.toThrow();
  });

  it("returns a non-disclosing 404 for cross-tenant resource access", () => {
    try {
      requireTenantMatch(principal, { tenantId: "tenant_abcdef0123456789" });
      throw new Error("Expected requireTenantMatch to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(404);
    }
  });

  it("denies a role that is not allowed for the operation", () => {
    try {
      requireTenantRole(principal, ["bookkeeper"]);
      throw new Error("Expected requireTenantRole to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(403);
    }
  });

  it("requires an authenticated complete tenant principal", () => {
    expect(requireTenantPrincipal(principal)).toEqual(principal);
    expect(() => requireTenantPrincipal(null)).toThrow(Response);
  });
});
