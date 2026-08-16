// auth-middleware.ts
// Standalone session validation helper — imported by index.ts and any
// future gateway sub-routes that need direct session access.

export type OrgRole = "owner" | "admin" | "member" | "viewer";
export type OrgPlan = "starter" | "growth" | "pro" | "enterprise";

export interface IHSession {
  sessionId: string;
  userId: string;
  orgId: string;
  email: string;
  name: string;
  orgName: string;
  orgSlug: string;
  role: OrgRole;
  plan: OrgPlan;
  mfaVerified: boolean;
  createdAt: number;
  expiresAt: number;
}

/**
 * Resolves an IHSession from the ih_session cookie against KV_SESSIONS.
 * Returns null if missing, expired, or invalid.
 */
export async function resolveSession(
  kv: KVNamespace,
  cookieHeader: string | undefined,
): Promise<IHSession | null> {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/ih_session=([^;\s]+)/);
  const sessionId = match?.[1];
  if (!sessionId) return null;

  const session = (await kv.get(`session:${sessionId}`, "json")) as IHSession | null;
  if (!session) return null;
  if (session.expiresAt < Math.floor(Date.now() / 1000)) return null;
  return session;
}

/**
 * Injects all IH identity headers onto a mutable Headers object.
 * Call this before forwarding any proxied request downstream.
 */
export function injectIdentityHeaders(headers: Headers, session: IHSession): void {
  headers.set("X-User-Id", session.userId);
  headers.set("X-Org-Id", session.orgId);
  headers.set("X-User-Email", session.email);
  headers.set("X-User-Name", session.name);
  headers.set("X-User-Role", session.role);
  headers.set("X-Org-Plan", session.plan);
  headers.set("X-Org-Slug", session.orgSlug);
  headers.set("X-Org-Name", session.orgName);
  headers.set("X-Gateway", "insighthunter-gateway");
}

/**
 * Returns true if the request Accept header prefers HTML (browser navigation).
 */
export function isBrowserRequest(req: Request): boolean {
  return (req.headers.get("Accept") ?? "").includes("text/html");
}

/**
 * Plan hierarchy rank — higher = more features.
 */
export const PLAN_RANK: Record<OrgPlan, number> = {
  starter: 0,
  growth: 1,
  pro: 2,
  enterprise: 3,
};

export function planSufficient(userPlan: OrgPlan, required: OrgPlan[]): boolean {
  return required.some((r) => PLAN_RANK[userPlan] >= PLAN_RANK[r]);
}
