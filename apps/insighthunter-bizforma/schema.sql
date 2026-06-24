CREATE TABLE IF NOT EXISTS formation_cases (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUESTIONNAIRE',
  entity_type TEXT,
  business_name TEXT,
  state TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_formation_cases_org_id
  ON formation_cases (org_id);

CREATE INDEX IF NOT EXISTS idx_formation_cases_status
  ON formation_cases (org_id, status);

CREATE TABLE IF NOT EXISTS compliance_events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  case_id TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_compliance_events_org_due
  ON compliance_events (org_id, due_date);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  size INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_documents_org
  ON documents (org_id);
