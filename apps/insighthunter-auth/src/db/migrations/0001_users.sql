CREATE TABLE IF NOT EXISTS orgs (
  id         TEXT NOT NULL PRIMARY KEY,
  name       TEXT NOT NULL,
  tier       TEXT NOT NULL DEFAULT 'lite',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT NOT NULL PRIMARY KEY,
  org_id        TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  tier          TEXT NOT NULL DEFAULT 'lite',
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES orgs(id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);

CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT NOT NULL PRIMARY KEY,
  org_id        TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  refresh_hash  TEXT NOT NULL UNIQUE,
  expires_at    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id          TEXT NOT NULL PRIMARY KEY,
  org_id      TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  provider    TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, provider_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
