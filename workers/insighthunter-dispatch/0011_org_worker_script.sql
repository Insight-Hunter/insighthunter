-- Migration 0011: add worker_script to orgs for enterprise tenant dispatch
ALTER TABLE orgs ADD COLUMN worker_script TEXT;

-- Migration 0012: add reports table if not exists (idempotent)
CREATE TABLE IF NOT EXISTS reports (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  period     TEXT NOT NULL,
  r2_key     TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reports_org ON reports(org_id);
