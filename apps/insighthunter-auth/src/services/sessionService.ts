import type { Env, SessionRecord } from "@/types";
import { kvSet, kvGet, kvDel } from "@/lib/cache";
import { insertSession, deleteSession, deleteAllUserSessions } from "@/db/queries";
import { logger } from "@/lib/logger";

const SESSION_PREFIX = "sess:";

export async function createSession(
  env: Env,
  userId: string,
  orgId: string,
  role: string,
  tier: string,
  request: Request
): Promise<string> {
  const sessionId = crypto.randomUUID();
  const ttl       = parseInt(env.REFRESH_EXPIRY ?? "2592000");
  const expiresAt = new Date(Date.now() + ttl * 1000);

  const record: SessionRecord = {
    userId,
    orgId,
    role:      role as SessionRecord["role"],
    tier:      tier as SessionRecord["tier"],
    ip:        request.headers.get("CF-Connecting-IP") ?? "unknown",
    userAgent: request.headers.get("User-Agent") ?? "unknown",
    createdAt: Date.now(),
    expiresAt: expiresAt.getTime(),
  };

  await Promise.all([
    kvSet(env.SESSIONS, `${SESSION_PREFIX}${sessionId}`, record, ttl),
    insertSession(env.DB, sessionId, userId, orgId, record.ip, record.userAgent, expiresAt.toISOString()),
  ]);

  logger.debug("Session created", { sessionId, userId });
  return sessionId;
}

export async function getSession(
  env: Env,
  sessionId: string
): Promise<SessionRecord | null> {
  const record = await kvGet<SessionRecord>(env.SESSIONS, `${SESSION_PREFIX}${sessionId}`);
  if (!record) return null;
  if (Date.now() > record.expiresAt) {
    await destroySession(env, sessionId, record.userId);
    return null;
  }
  return record;
}

export async function destroySession(
  env: Env,
  sessionId: string,
  userId: string
): Promise<void> {
  await Promise.all([
    kvDel(env.SESSIONS, `${SESSION_PREFIX}${sessionId}`),
    deleteSession(env.DB, sessionId),
  ]);
  logger.debug("Session destroyed", { sessionId, userId });
}

export async function destroyAllSessions(
  env: Env,
  userId: string
): Promise<void> {
  await deleteAllUserSessions(env.DB, userId);
  logger.info("All sessions revoked", { userId });
}
