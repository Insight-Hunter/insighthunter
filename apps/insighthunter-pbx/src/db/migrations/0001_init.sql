-- org_id first on every tenant-scoped table
CREATE TABLE IF NOT EXISTS records (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (org_id, id)
);
