CREATE TABLE IF NOT EXISTS tenant_registry (
  org_id       TEXT NOT NULL PRIMARY KEY,
  worker_name  TEXT NOT NULL,
  tier         TEXT NOT NULL DEFAULT 'lite',
  r2_prefix    TEXT,
  kv_prefix    TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tenant_registry_worker ON tenant_registry(worker_name);
