-- insighthunter-auth D1 schema
-- Auth + entitlement metadata ONLY. No financial/business data lives here —
-- that lives in each user's isolated UserVault Durable Object / module DBs.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                 -- uuid v4
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,         -- PBKDF2 hash, includes salt+iterations
  tier TEXT NOT NULL DEFAULT 'startup',-- startup | standard | pro
  status TEXT NOT NULL DEFAULT 'active', -- active | suspended | deleted
  vault_do_id TEXT NOT NULL,           -- Durable Object id (hex) for this user
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS entitlements (
  user_id TEXT NOT NULL REFERENCES users(id),
  module TEXT NOT NULL,                -- bookkeeping | bizforma | payroll | reports | insights | pbx
  tier TEXT NOT NULL,                  -- module-specific tier, may differ from account tier
  status TEXT NOT NULL DEFAULT 'active',
  granted_at INTEGER NOT NULL,
  expires_at INTEGER,                  -- null = no expiry (until cancelled)
  PRIMARY KEY (user_id, module)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  event TEXT NOT NULL,                 -- register | login | login_failed | logout | tier_change
  ip TEXT,
  created_at INTEGER NOT NULL
);
