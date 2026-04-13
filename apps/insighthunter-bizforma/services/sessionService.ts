import type { D1Database, KVNamespace } from "@cloudflare/workers-types";

export type AuthContext = {
  sub: string;
  email?: string;
  tenantId?: string;
  roles?: string[];
};

export type WizardData = Record<string, Record<string, unknown>>;

export type WizardSessionRecord = {
  sessionId: string;
  userId: string;
  tenantId: string | null;
  email: string | null;
  currentStep: number;
  data: WizardData;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type UpsertWizardSessionInput = {
  sessionId: string;
  currentStep: number;
  data: WizardData;
};

export type SessionServiceEnv = {
  DB: D1Database;
  SESSIONS: KVNamespace;
};

const KV_PREFIX = "bizforma:session";
const KV_TTL_SECONDS = 60 * 30;

function cacheKey(sessionId: string) {
  return `${KV_PREFIX}:${sessionId}`;
}

function coerceJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeStep(step: unknown) {
  const numeric = Number(step);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.floor(numeric);
}

export async function getWizardSession(
  env: SessionServiceEnv,
  auth: AuthContext,
  sessionId: string
): Promise<WizardSessionRecord | null> {
  const cached = await env.SESSIONS.get(cacheKey(sessionId), "json");

  if (cached && typeof cached === "object") {
    const record = cached as WizardSessionRecord;

    if (
      record.sessionId === sessionId &&
      record.userId === auth.sub &&
      record.tenantId === (auth.tenantId ?? null)
    ) {
      return record;
    }
  }

  const row = await env.DB.prepare(
    `
      SELECT
        session_id,
        user_id,
        tenant_id,
        email,
        current_step,
        data_json,
        version,
        created_at,
        updated_at
      FROM sessions
      WHERE session_id = ?1
        AND user_id = ?2
        AND (
          (tenant_id IS NULL AND ?3 IS NULL)
          OR tenant_id = ?3
        )
      LIMIT 1
    `
  )
    .bind(sessionId, auth.sub, auth.tenantId ?? null)
    .first<{
      session_id: string;
      user_id: string;
      tenant_id: string | null;
      email: string | null;
      current_step: number;
      data_json: string | null;
      version: number;
      created_at: string;
      updated_at: string;
    }>();

  if (!row) {
    return null;
  }

  const record: WizardSessionRecord = {
    sessionId: row.session_id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    email: row.email,
    currentStep: normalizeStep(row.current_step),
    data: coerceJson<WizardData>(row.data_json, {}),
    version: row.version ?? 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  await env.SESSIONS.put(cacheKey(sessionId), JSON.stringify(record), {
    expirationTtl: KV_TTL_SECONDS,
  });

  return record;
}

export async function createWizardSession(
  env: SessionServiceEnv,
  auth: AuthContext,
  input: UpsertWizardSessionInput
): Promise<WizardSessionRecord> {
  const now = new Date().toISOString();
  const currentStep = normalizeStep(input.currentStep);
  const dataJson = JSON.stringify(input.data ?? {});

  await env.DB.prepare(
    `
      INSERT INTO sessions (
        session_id,
        user_id,
        tenant_id,
        email,
        current_step,
        data_json,
        version,
        created_at,
        updated_at
      )
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?7)
    `
  )
    .bind(
      input.sessionId,
      auth.sub,
      auth.tenantId ?? null,
      auth.email ?? null,
      currentStep,
      dataJson,
      now
    )
    .run();

  const record: WizardSessionRecord = {
    sessionId: input.sessionId,
    userId: auth.sub,
    tenantId: auth.tenantId ?? null,
    email: auth.email ?? null,
    currentStep,
    data: input.data ?? {},
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  await env.SESSIONS.put(cacheKey(input.sessionId), JSON.stringify(record), {
    expirationTtl: KV_TTL_SECONDS,
  });

  return record;
}

export async function upsertWizardSession(
  env: SessionServiceEnv,
  auth: AuthContext,
  input: UpsertWizardSessionInput
): Promise<WizardSessionRecord> {
  const existing = await getWizardSession(env, auth, input.sessionId);

  if (!existing) {
    return createWizardSession(env, auth, input);
  }

  const now = new Date().toISOString();
  const nextVersion = existing.version + 1;
  const currentStep = normalizeStep(input.currentStep);
  const data = input.data ?? {};
  const dataJson = JSON.stringify(data);

  await env.DB.prepare(
    `
      UPDATE sessions
      SET
        current_step = ?1,
        data_json = ?2,
        version = ?3,
        updated_at = ?4,
        email = ?5
      WHERE session_id = ?6
        AND user_id = ?7
        AND (
          (tenant_id IS NULL AND ?8 IS NULL)
          OR tenant_id = ?8
        )
    `
  )
    .bind(
      currentStep,
      dataJson,
      nextVersion,
      now,
      auth.email ?? existing.email ?? null,
      input.sessionId,
      auth.sub,
      auth.tenantId ?? null
    )
    .run();

  const record: WizardSessionRecord = {
    ...existing,
    currentStep,
    data,
    version: nextVersion,
    email: auth.email ?? existing.email ?? null,
    updatedAt: now,
  };

  await env.SESSIONS.put(cacheKey(input.sessionId), JSON.stringify(record), {
    expirationTtl: KV_TTL_SECONDS,
  });

  return record;
}

export async function listWizardSessionsForUser(
  env: SessionServiceEnv,
  auth: AuthContext,
  limit = 20
): Promise<WizardSessionRecord[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));

  const { results } = await env.DB.prepare(
    `
      SELECT
        session_id,
        user_id,
        tenant_id,
        email,
        current_step,
        data_json,
        version,
        created_at,
        updated_at
      FROM sessions
      WHERE user_id = ?1
        AND (
          (tenant_id IS NULL AND ?2 IS NULL)
          OR tenant_id = ?2
        )
      ORDER BY updated_at DESC
      LIMIT ?3
    `
  )
    .bind(auth.sub, auth.tenantId ?? null, safeLimit)
    .all<{
      session_id: string;
      user_id: string;
      tenant_id: string | null;
      email: string | null;
      current_step: number;
      data_json: string | null;
      version: number;
      created_at: string;
      updated_at: string;
    }>();

  return (results ?? []).map((row) => ({
    sessionId: row.session_id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    email: row.email,
    currentStep: normalizeStep(row.current_step),
    data: coerceJson<WizardData>(row.data_json, {}),
    version: row.version ?? 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
