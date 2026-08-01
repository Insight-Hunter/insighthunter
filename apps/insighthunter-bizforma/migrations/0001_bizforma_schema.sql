-- apps/insighthunter-bizforma/migrations/0001_bizforma_schema.sql
-- BizForma: formation cases, documents, compliance events, wizard sessions

CREATE TABLE IF NOT EXISTS bizforma_cases (
  id                TEXT PRIMARY KEY,
  org_id            TEXT NOT NULL,
  user_id           TEXT NOT NULL,
  entity_type       TEXT NOT NULL,   -- LLC | S-Corp | C-Corp | Sole Proprietorship | Partnership
  state             TEXT NOT NULL,   -- 2-letter US state code
  business_name     TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft',
  registered_agent  TEXT,
  ein               TEXT,
  formation_date    TEXT,
  metadata_json     TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bizforma_documents (
  id          TEXT PRIMARY KEY,
  case_id     TEXT NOT NULL REFERENCES bizforma_cases(id) ON DELETE CASCADE,
  org_id      TEXT NOT NULL,
  doc_type    TEXT NOT NULL,
  filename    TEXT NOT NULL,
  r2_key      TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bizforma_compliance_events (
  id          TEXT PRIMARY KEY,
  case_id     TEXT NOT NULL REFERENCES bizforma_cases(id) ON DELETE CASCADE,
  org_id      TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  title       TEXT NOT NULL,
  due_date    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bizforma_wizard_sessions (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL,
  user_id      TEXT NOT NULL,
  step         INTEGER NOT NULL DEFAULT 0,
  total_steps  INTEGER NOT NULL DEFAULT 6,
  data_json    TEXT NOT NULL DEFAULT '{}',
  completed    INTEGER NOT NULL DEFAULT 0,
  expires_at   TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_biz_cases_org       ON bizforma_cases(org_id);
CREATE INDEX IF NOT EXISTS idx_biz_cases_status    ON bizforma_cases(status);
CREATE INDEX IF NOT EXISTS idx_biz_docs_case       ON bizforma_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_biz_events_case     ON bizforma_compliance_events(case_id, due_date);
CREATE INDEX IF NOT EXISTS idx_biz_events_org_due  ON bizforma_compliance_events(org_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_biz_wizard_org      ON bizforma_wizard_sessions(org_id, completed);
