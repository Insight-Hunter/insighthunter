CREATE TABLE IF NOT EXISTS qb_connections (
  org_id        TEXT PRIMARY KEY,
  realm_id      TEXT NOT NULL,
  access_token  TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at    INTEGER NOT NULL,
  company_name  TEXT NOT NULL,
  last_synced_at TEXT,
  connected_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Sync log to track what was pushed/pulled
CREATE TABLE IF NOT EXISTS qb_sync_log (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL,
  direction     TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  qb_id         TEXT,
  status        TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  synced_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_qb_sync_org ON qb_sync_log(org_id, synced_at DESC);
