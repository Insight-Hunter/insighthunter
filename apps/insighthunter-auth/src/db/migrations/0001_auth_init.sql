-- 0001_auth_init.sql
-- Insight Hunter Auth DB — initial schema

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── tenants ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenants (
  id            TEXT PRIMARY KEY,
  business_name TEXT NOT NULL DEFAULT '',
  tier          TEXT NOT NULL DEFAULT 'startup'
                CHECK (tier IN ('startup','standard','pro','enterprise')),
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','provisioning','active','suspended','provisioning_failed')),
  db_id         TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- ── users ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member'
                CHECK (role IN ('owner','admin','member','accountant','readonly')),
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','suspended','deleted')),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_tenant    ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email     ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status    ON users(status);

-- ── refresh_tokens ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TEXT NOT NULL,
  revoked     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_rt_user      ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_rt_hash      ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_rt_expires   ON refresh_tokens(expires_at);

-- ── verification_tokens ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS verification_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  purpose     TEXT NOT NULL CHECK (purpose IN ('email_verify','password_reset','invite')),
  expires_at  TEXT NOT NULL,
  used        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vt_hash     ON verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_vt_user     ON verification_tokens(user_id);

-- ── provisioning_jobs ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS provisioning_jobs (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'queued'
              CHECK (status IN ('queued','provisioning','active','failed')),
  detail      TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pj_tenant   ON provisioning_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pj_status   ON provisioning_jobs(status);

-- ── billing_events ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS billing_events (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type      TEXT NOT NULL,
  payload         TEXT NOT NULL,
  processed       INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_be_tenant    ON billing_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_be_stripe    ON billing_events(stripe_event_id);

-- ── auth_audit_log ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS auth_audit_log (
  id         TEXT PRIMARY KEY,
  user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  tenant_id  TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  event      TEXT NOT NULL,
  ip_hash    TEXT,
  detail     TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aal_user     ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_aal_tenant   ON auth_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_aal_event    ON auth_audit_log(event);
CREATE INDEX IF NOT EXISTS idx_aal_created  ON auth_audit_log(created_at);
