PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id                   TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email                TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash        TEXT,                        -- NULL if magic-link only user
  full_name            TEXT,
  company_name         TEXT,
  subscription_tier    TEXT NOT NULL DEFAULT 'free'
                       CHECK (subscription_tier IN ('free','starter','growth','enterprise')),
  stripe_customer_id   TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  email_verified       INTEGER NOT NULL DEFAULT 0,  -- 0 = false, 1 = true
  trial_ends_at        TEXT,
  current_period_ends_at TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,   -- 'signup' | 'login' | 'logout' | 'verify_email' | 'reset_password'
  ip_address TEXT,
  user_agent TEXT,
  metadata   TEXT,            -- JSON string
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_users_email      ON users(email);
CREATE INDEX        idx_sessions_user    ON sessions(user_id);
CREATE INDEX        idx_sessions_expires ON sessions(expires_at);
CREATE INDEX        idx_audit_user       ON audit_log(user_id);
CREATE INDEX        idx_audit_action     ON audit_log(action, created_at DESC);
