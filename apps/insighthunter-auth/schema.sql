-- Users table
-- Migration note: if upgrading an existing DB, run the ALTER statements
-- at the bottom of this file before redeploying.
CREATE TABLE IF NOT EXISTS users (
CREATE TABLE IF NOT EXISTS users (
  id           TEXT    PRIMARY KEY,
  email        TEXT    NOT NULL UNIQUE,
  password_hash TEXT   NOT NULL,
  name         TEXT    NOT NULL DEFAULT '',
  org_name     TEXT    NOT NULL DEFAULT '',
  role         TEXT    NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  tier         TEXT    NOT NULL DEFAULT 'lite' CHECK (tier IN ('lite', 'standard', 'pro', 'enterprise')),
  status       TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  vault_do_id  TEXT    NOT NULL DEFAULT '',
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT    REFERENCES users(id),
  event      TEXT    NOT NULL,
  ip         TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_created_at
  ON audit_log(user_id, created_at DESC);

-- ── Incremental migrations (safe to run on existing DBs) ──────────────────────
-- Run these manually via `wrangler d1 execute` if upgrading from a previous schema.
--
-- ALTER TABLE users ADD COLUMN name     TEXT NOT NULL DEFAULT '';
-- ALTER TABLE users ADD COLUMN org_name TEXT NOT NULL DEFAULT '';
-- ALTER TABLE users ADD COLUMN role     TEXT NOT NULL DEFAULT 'owner';
-- UPDATE users SET tier = 'lite' WHERE tier = 'startup';  -- rename old tier value
