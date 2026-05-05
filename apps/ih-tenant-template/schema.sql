-- All tables MUST have org_id as first column
CREATE TABLE IF NOT EXISTS org_profile (
  org_id        TEXT NOT NULL PRIMARY KEY,
  business_name TEXT,
  industry      TEXT,
  timezone      TEXT NOT NULL DEFAULT 'UTC',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id         TEXT NOT NULL,
  org_id     TEXT NOT NULL,
  metric     TEXT NOT NULL,
  value      REAL NOT NULL,
  period     TEXT NOT NULL,
  captured_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id),
  FOREIGN KEY (org_id) REFERENCES org_profile(org_id)
);

CREATE INDEX IF NOT EXISTS idx_kpi_org ON kpi_snapshots(org_id, period);

CREATE TABLE IF NOT EXISTS audit_log (
  id         TEXT NOT NULL PRIMARY KEY,
  org_id     TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  action     TEXT NOT NULL,
  resource   TEXT,
  detail     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_log(org_id, created_at);
