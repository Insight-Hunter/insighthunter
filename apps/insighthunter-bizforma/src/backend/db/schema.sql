-- Formation Cases
CREATE TABLE IF NOT EXISTS formation_cases (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  business_name TEXT NOT NULL,
  entity_type   TEXT,
  status        TEXT NOT NULL DEFAULT 'QUESTIONNAIRE',
  state         TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_formation_cases_org ON formation_cases(org_id);

-- Questionnaire Answers
CREATE TABLE IF NOT EXISTS questionnaire_answers (
  id           TEXT PRIMARY KEY,
  case_id      TEXT NOT NULL REFERENCES formation_cases(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  answer       TEXT NOT NULL,
  answered_at  TEXT NOT NULL,
  UNIQUE(case_id, question_key)
);

-- EIN Applications
CREATE TABLE IF NOT EXISTS ein_applications (
  id                   TEXT PRIMARY KEY,
  case_id              TEXT NOT NULL UNIQUE REFERENCES formation_cases(id) ON DELETE CASCADE,
  legal_name           TEXT NOT NULL,
  trade_name_dba       TEXT,
  responsible_party    TEXT,
  address              TEXT,         -- JSON
  reason_for_applying  TEXT,
  status               TEXT NOT NULL DEFAULT 'draft',
  ein                  TEXT,
  submitted_at         TEXT,
  created_at           TEXT NOT NULL
);

-- State Registrations
CREATE TABLE IF NOT EXISTS state_registrations (
  id                  TEXT PRIMARY KEY,
  case_id             TEXT NOT NULL REFERENCES formation_cases(id) ON DELETE CASCADE,
  state               TEXT NOT NULL,
  filing_type         TEXT NOT NULL,
  filing_fee          INTEGER NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending',
  confirmation_number TEXT,
  filed_at            TEXT,
  created_at          TEXT NOT NULL
);

-- Tax Accounts
CREATE TABLE IF NOT EXISTS tax_accounts (
  id           TEXT PRIMARY KEY,
  case_id      TEXT NOT NULL REFERENCES formation_cases(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'not_started',
  account_id   TEXT,
  completed_at TEXT,
  created_at   TEXT NOT NULL,
  UNIQUE(case_id, account_type)
);

-- Compliance Events
CREATE TABLE IF NOT EXISTS compliance_events (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL,
  case_id       TEXT NOT NULL REFERENCES formation_cases(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  title         TEXT NOT NULL,
  due_date      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'upcoming',
  reminder_sent INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_compliance_org ON compliance_events(org_id);

-- Formation Documents
CREATE TABLE IF NOT EXISTS formation_documents (
  id          TEXT PRIMARY KEY,
  case_id     TEXT NOT NULL REFERENCES formation_cases(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  r2_key      TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  size_bytes  INTEGER NOT NULL,
  uploaded_at TEXT NOT NULL
);
