import type { MiddlewareHandler } from 'hono';
import { getSession, type SessionRecord } from './session.js';

export type OrganizationRecord = {
  id: string;
};

export type MemberRecord = {
  userId: string;
  email: string;
};

export type AppBindings = {
  AUTH_BASE_URL: string;
  MAIN_BASE_URL: string;
};

export type AppVariables = {
  session: SessionRecord;
  organization: OrganizationRecord | null;
  member: MemberRecord;
};

type AppEnv = {
  Bindings: AppBindings;
  Variables: AppVariables;
};

function buildLoginUrl(authBaseUrl: string, returnTo: string): string {
  const base = authBaseUrl.replace(/\/$/, '');
  return `${base}/login?returnTo=${encodeURIComponent(returnTo)}`;
}

function toOrganization(session: SessionRecord): OrganizationRecord | null {
  if (!session.user.orgId) return null;
  return { id: session.user.orgId };
}

function toMember(session: SessionRecord): MemberRecord {
  return {
    userId: session.user.subject,
    email: session.user.email ?? '',
  };
}

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const session = await getSession(c.env.AUTH_BASE_URL, c.req.raw);

  if (!session) {
    const url = new URL(c.req.url);
    const returnTo = `${c.env.MAIN_BASE_URL.replace(/\/$/, '')}${url.pathname}${url.search}`;
    return c.redirect(buildLoginUrl(c.env.AUTH_BASE_URL, returnTo), 302);
  }

  c.set('session', session);
  c.set('organization', toOrganization(session));
  c.set('member', toMember(session));

  await next();
};
