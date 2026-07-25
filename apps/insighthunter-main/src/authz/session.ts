import { extractSessionToken } from '@insighthunter/auth-shared';

export type SessionUser = {
  subject: string;
  email?: string;
  orgId?: string;
};

export type SessionRecord = {
  token: string;
  user: SessionUser;
  expiresAt: string;
};

type SessionLookupResponse = {
  ok: boolean;
  session?: SessionRecord;
};

export async function getSession(
  authBaseUrl: string,
  request: Request,
): Promise<SessionRecord | null> {
  const token = extractSessionToken(request);
  if (!token) return null;

  try {
    const base = authBaseUrl.replace(/\/$/, '');
    const res = await fetch(`${base}/session/${encodeURIComponent(token)}`);

    if (!res.ok) return null;

    const payload = (await res.json()) as SessionLookupResponse;
    return payload.ok ? payload.session ?? null : null;
  } catch {
    return null;
  }
}
