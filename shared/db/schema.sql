-- InsightHunter D1 Schema
-- Run: wrangler d1 execute insighthunter-db --file=shared/db/schema.sql

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ============================================================
-- USERS (auto-created on first Cloudflare Access login)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  email                 TEXT    NOT NULL UNIQUE,
  business_name         TEXT,
  industry              TEXT,
  team_size             TEXT,
  plan                  TEXT    NOT NULL DEFAULT 'free'
                        CHECK(plan IN ('free','lite','pro','enterprise')),
  subscription_status   TEXT    NOT NULL DEFAULT 'inactive'
                        CHECK(subscription_status IN
                          ('inactive','trialing','active','past_due','canceled')),
  stripe_customer_id    TEXT    UNIQUE,
  stripe_subscription_id TEXT   UNIQUE,
  onboarding_complete   INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_sub ON users(stripe_subscription_id);

-- ============================================================
-- AUDIT LOG (optional but recommended for SaaS)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT    NOT NULL,
  resource   TEXT,
  detail     TEXT,
  ip         TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- ============================================================
-- FEATURE FLAGS (per-plan feature gating reference table)
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  feature    TEXT NOT NULL,
  plan       TEXT NOT NULL CHECK(plan IN ('free','lite','pro','enterprise')),
  enabled    INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (feature, plan)
);

-- Seed default feature gates
INSERT OR IGNORE INTO feature_flags (feature, plan, enabled) VALUES
  ('bookkeeping_basic',    'free',       1),
  ('bookkeeping_advanced', 'free',       0),
  ('bookkeeping_advanced', 'lite',       1),
  ('bookkeeping_advanced', 'pro',        1),
  ('bookkeeping_advanced', 'enterprise', 1),
  ('payroll',              'free',       0),
  ('payroll',              'lite',       0),
  ('payroll',              'pro',        1),
  ('payroll',              'enterprise', 1),
  ('ai_insights',          'free',       0),
  ('ai_insights',          'lite',       1),
  ('ai_insights',          'pro',        1),
  ('ai_insights',          'enterprise', 1),
  ('api_access',           'free',       0),
  ('api_access',           'lite',       0),
  ('api_access',           'pro',        1),
  ('api_access',           'enterprise', 1),
  ('multi_entity',         'free',       0),
  ('multi_entity',         'lite',       0),
  ('multi_entity',         'pro',        0),
  ('multi_entity',         'enterprise', 1);
