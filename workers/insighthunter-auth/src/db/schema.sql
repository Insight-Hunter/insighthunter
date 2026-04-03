-- insighthunter-auth schema

CREATE TABLE IF NOT EXISTS orgs (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name           TEXT NOT NULL,
  tier           TEXT NOT NULL DEFAULT 'free',
  owner_id       TEXT,
  worker_script  TEXT,
  custom_domain  TEXT,
  stripe_sub_id  TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email          TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  password_hash  TEXT,
  org_id         TEXT NOT NULL REFERENCES orgs(id),
  role           TEXT NOT NULL DEFAULT 'owner',
  email_verified INTEGER NOT NULL DEFAULT 0,
  last_login     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_org   ON users(org_id);

CREATE TABLE IF NOT EXISTS password_resets (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
