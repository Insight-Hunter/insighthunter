// packages/authz/src/index.ts
export type OrgRole =
  | "owner"
  | "admin"
  | "finance_manager"
  | "analyst"
  | "bookkeeper"
  | "viewer";

export type Permission =
  | "org:read"
  | "org:update"
  | "members:read"
  | "members:invite"
  | "members:update"
  | "billing:read"
  | "billing:update"
  | "reports:read"
  | "reports:export"
  | "forecast:read"
  | "forecast:write"
  | "transactions:read"
  | "transactions:write"
  | "documents:read"
  | "documents:write"
  | "payroll:read"
  | "payroll:write"
  | "bookkeeping:read"
  | "bookkeeping:write"
  | "audit:read"
  | "settings:read"
  | "settings:write";

export interface SessionPrincipal {
  userId: string;
  email: string;
  emailVerified: boolean;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
}

export interface TenantContext {
  orgId: string;
  role: OrgRole;
  permissions: Permission[];
}

export interface AuthContext {
  principal: SessionPrincipal;
  tenant: TenantContext;
}

export interface Env {
  DB: D1Database;
  AUTH_ISSUER: string;
  AUTH_AUDIENCE: string;
  AUTH_JWKS_URL: string;
}

const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  owner: [
    "org:read","org:update","members:read","members:invite","members:update",
    "billing:read","billing:update","reports:read","reports:export",
    "forecast:read","forecast:write","transactions:read","transactions:write",
    "documents:read","documents:write","payroll:read","payroll:write",
    "bookkeeping:read","bookkeeping:write","audit:read","settings:read","settings:write",
  ],
  admin: [
    "org:read","org:update","members:read","members:invite","members:update",
    "reports:read","reports:export","forecast:read","forecast:write",
    "transactions:read","transactions:write","documents:read","documents:write",
    "payroll:read","payroll:write","bookkeeping:read","bookkeeping:write",
    "audit:read","settings:read","settings:write",
  ],
  finance_manager: [
    "org:read","members:read","reports:read","reports:export",
    "forecast:read","forecast:write","transactions:read","transactions:write",
    "documents:read","documents:write","payroll:read","payroll:write",
    "bookkeeping:read","bookkeeping:write","settings:read",
  ],
  analyst: [
    "org:read","members:read","reports:read","forecast:read",
    "transactions:read","documents:read","settings:read",
  ],
  bookkeeper: [
    "org:read","reports:read","transactions:read","transactions:write",
    "documents:read","documents:write","bookkeeping:read","bookkeeping:write",
    "settings:read",
  ],
  viewer: [
    "org:read","reports:read","forecast:read","documents:read","settings:read",
  ],
};

interface JwtPayload {
  sub: string;
  email: string;
  email_verified?: boolean;
  sid: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
}

function getBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  const [scheme, token] = auth.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

async function parseJwtWithoutVerification(token: string): Promise<JwtPayload> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT");
  const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  return payload as JwtPayload;
}

async function validateSessionToken(token: string, env: Env): Promise<SessionPrincipal> {
  const payload = await parseJwtWithoutVerification(token);

  if (payload.iss !== env.AUTH_ISSUER) throw new Error("Invalid issuer");

  const audienceOk = Array.isArray(payload.aud)
    ? payload.aud.includes(env.AUTH_AUDIENCE)
    : payload.aud === env.AUTH_AUDIENCE;

  if (!audienceOk) throw new Error("Invalid audience");
  if (payload.exp * 1000 < Date.now()) throw new Error("Expired session");

  return {
    userId: payload.sub,
    email: payload.email,
    emailVerified: Boolean(payload.email_verified),
    sessionId: payload.sid,
    issuedAt: payload.iat,
    expiresAt: payload.exp,
  };
}

export async function loadTenantContext(
  db: D1Database,
  userId: string,
  orgId: string,
): Promise<TenantContext | null> {
  const row = await db
    .prepare(
      `
      SELECT
        om.org_id as orgId,
        om.role as role
      FROM organization_members om
      WHERE om.user_id = ?1
        AND om.org_id = ?2
        AND om.status = 'active'
      LIMIT 1
      `
    )
    .bind(userId, orgId)
    .first<{ orgId: string; role: OrgRole }>();

  if (!row) return null;

  return {
    orgId: row.orgId,
    role: row.role,
    permissions: ROLE_PERMISSIONS[row.role] ?? [],
  };
}

export async function requireAuth(
  request: Request,
  env: Env,
  orgId: string,
): Promise<AuthContext> {
  const token = getBearerToken(request);
  if (!token) throw new Response("Unauthorized", { status: 401 });

  const principal = await validateSessionToken(token, env);

  if (!principal.emailVerified) {
    throw new Response("Email verification required", { status: 403 });
  }

  const tenant = await loadTenantContext(env.DB, principal.userId, orgId);
  if (!tenant) throw new Response("Forbidden", { status: 403 });

  return { principal, tenant };
}

export function requirePermission(
  auth: AuthContext,
  permission: Permission,
): void {
  if (!auth.tenant.permissions.includes(permission)) {
    throw new Response("Forbidden", { status: 403 });
  }
}

export async function writeAuditLog(
  db: D1Database,
  input: {
    orgId: string;
    userId: string;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadataJson?: string | null;
  },
): Promise<void> {
  await db
    .prepare(
      `
      INSERT INTO audit_logs (
        id, org_id, user_id, action, resource_type, resource_id,
        ip_address, user_agent, metadata_json, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'))
      `
    )
    .bind(
      crypto.randomUUID(),
      input.orgId,
      input.userId,
      input.action,
      input.resourceType,
      input.resourceId ?? null,
      input.ipAddress ?? null,
      input.userAgent ?? null,
      input.metadataJson ?? null,
    )
    .run();
}
