-- 0003: fine-grained roles per org
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
