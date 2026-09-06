export interface TenantPrincipal {
  readonly subject: string;
  readonly tenantId: string;
  readonly roles: readonly string[];
  readonly sessionId: string;
}

export interface TenantScopedResource {
  readonly tenantId: string;
}

const TENANT_ID_PATTERN = /^[a-zA-Z0-9_-]{16,128}$/;

function jsonError(status: number, error: string, message: string): Response {
  return new Response(JSON.stringify({ error, message }), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export function requireTenantId(value: string | null | undefined): string {
  if (!value || !TENANT_ID_PATTERN.test(value)) {
    throw jsonError(
      401,
      "invalid_tenant_context",
      "A valid tenant context is required.",
    );
  }

  return value;
}

export function requireTenantMatch(
  principal: TenantPrincipal,
  resource: TenantScopedResource,
): void {
  if (principal.tenantId !== resource.tenantId) {
    throw jsonError(
      404,
      "resource_not_found",
      "The requested resource is not available.",
    );
  }
}

export function requireTenantRole(
  principal: TenantPrincipal,
  allowedRoles: readonly string[],
): void {
  if (!principal.roles.some((role) => allowedRoles.includes(role))) {
    throw jsonError(
      403,
      "insufficient_role",
      "Your role does not permit this action.",
    );
  }
}

export function requireTenantPrincipal(
  principal: TenantPrincipal | null | undefined,
): TenantPrincipal {
  if (!principal) {
    throw jsonError(401, "unauthenticated", "Authentication is required.");
  }

  requireTenantId(principal.tenantId);

  if (!principal.subject || !principal.sessionId) {
    throw jsonError(401, "invalid_session", "A valid session is required.");
  }

  return principal;
}
