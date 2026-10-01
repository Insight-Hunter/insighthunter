PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  organization_name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'startup' CHECK (tier IN ('startup', 'standard', 'pro')),
  status TEXT NOT NULL DEFAULT 'provisioning' CHECK (status IN ('provisioning', 'active', 'suspended', 'canceled', 'deprovisioned')),
  d1_database_id TEXT,
  d1_database_name TEXT,
  dispatch_namespace TEXT,
  dispatch_script_name TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'active', 'disabled')),
  email_verified_at TEXT,
  oauth_provider TEXT,
  oauth_subject TEXT,
  mfa_enabled INTEGER NOT NULL DEFAULT 0 CHECK (mfa_enabled IN (0, 1)),
  mfa_secret_encrypted TEXT,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE (email)
);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth ON users (oauth_provider, oauth_subject) WHERE oauth_provider IS NOT NULL;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_hash TEXT,
  revoked_at TEXT,
  replaced_by_token_id TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE (token_hash)
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens (user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_tenant ON refresh_tokens (tenant_id);

CREATE TABLE IF NOT EXISTS verification_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('email_verify', 'password_reset')),
  consumed_at TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (token_hash)
);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_purpose ON verification_tokens (user_id, purpose);

CREATE TABLE IF NOT EXISTS provisioning_jobs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'completed', 'failed')),
  step TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,
  last_error TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_provisioning_jobs_tenant ON provisioning_jobs (tenant_id, status);

CREATE TABLE IF NOT EXISTS billing_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  stripe_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  processed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
  UNIQUE (stripe_event_id)
);
CREATE INDEX IF NOT EXISTS idx_billing_events_tenant ON billing_events (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS auth_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  user_id TEXT,
  event_type TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure')),
  ip_hash TEXT,
  user_agent TEXT,
  details_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_tenant ON auth_audit_log (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user ON auth_audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_event ON auth_audit_log (event_type, created_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_tenants_updated_at AFTER UPDATE ON tenants FOR EACH ROW
BEGIN UPDATE tenants SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_users_updated_at AFTER UPDATE ON users FOR EACH ROW
BEGIN UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_provisioning_jobs_updated_at AFTER UPDATE ON provisioning_jobs FOR EACH ROW
BEGIN UPDATE provisioning_jobs SET updated_at = datetime('now') WHERE id = NEW.id; END;
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
