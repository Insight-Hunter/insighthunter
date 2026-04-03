CREATE TABLE IF NOT EXISTS orgs (
  id         TEXT    PRIMARY KEY,
  name       TEXT    NOT NULL,
  plan       TEXT    NOT NULL DEFAULT 'free',
  owner_id   TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orgs_owner ON orgs(owner_id);
