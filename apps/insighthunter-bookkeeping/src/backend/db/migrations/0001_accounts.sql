CREATE TABLE IF NOT EXISTS accounts (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL,
  type        TEXT NOT NULL,
  subtype     TEXT NOT NULL,
  description TEXT,
  parent_id   TEXT REFERENCES accounts(id),
  is_active   INTEGER NOT NULL DEFAULT 1,
  qb_account_id TEXT,
  balance     REAL NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_accounts_org ON accounts(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_org_code ON accounts(org_id, code);
