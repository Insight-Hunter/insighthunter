-- Tenant worker provisioning metadata
CREATE TABLE IF NOT EXISTS tenant_workers (
  org_id             TEXT PRIMARY KEY,
  script_name        TEXT NOT NULL,
  kv_namespace_id    TEXT NOT NULL,
  dispatch_namespace TEXT NOT NULL,
  tier               TEXT NOT NULL DEFAULT 'lite',
  provisioned_at     TEXT NOT NULL,
  deprovisioned_at   TEXT
);

-- Provisioning failures for manual review
CREATE TABLE IF NOT EXISTS provisioning_failures (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id     TEXT NOT NULL,
  job_type   TEXT NOT NULL,
  error      TEXT,
  resolved   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
