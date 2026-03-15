-- Full schema reference — applied via migrations

CREATE TABLE IF NOT EXISTS orgs (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  tier       TEXT NOT NULL DEFAULT 'lite',
  status     TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  org_id         TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  email          TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'member',
  tier           TEXT NOT NULL DEFAULT 'lite',
  email_verified INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'pending',
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_org    ON users(org_id);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id     TEXT NOT NULL,
  ip         TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS roles (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member',
  granted_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_roles_org  ON roles(org_id);
CREATE INDEX IF NOT EXISTS idx_roles_user ON roles(user_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL,
  user_id    TEXT,
  action     TEXT NOT NULL,
  ip         TEXT,
  meta       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_org  ON audit_log(org_id, created_at DESC);
