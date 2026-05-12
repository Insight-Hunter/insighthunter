-- insighthunter-bizforma schema

CREATE TABLE IF NOT EXISTS formation_cases (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id        TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'QUESTIONNAIRE'
    CHECK(status IN ('QUESTIONNAIRE','ENTITY_SELECTED','EIN_PENDING','EIN_COMPLETE','STATE_PENDING','STATE_COMPLETE','TAX_SETUP','COMPLETE')),
  entity_type   TEXT CHECK(entity_type IN ('SOLE_PROP','LLC','S_CORP','C_CORP','PARTNERSHIP','NONPROFIT')),
  business_name TEXT,
  state         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cases_org ON formation_cases(org_id);

CREATE TABLE IF NOT EXISTS questionnaire_answers (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  case_id    TEXT NOT NULL REFERENCES formation_cases(id) ON DELETE CASCADE,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ein_applications (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  case_id      TEXT REFERENCES formation_cases(id),
  status       TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SUBMITTED','APPROVED','REJECTED')),
  ein          TEXT,
  submitted_at TEXT,
  approved_at  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS state_registrations (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  case_id     TEXT REFERENCES formation_cases(id),
  state       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','FILED','APPROVED','REJECTED')),
  filing_fee  REAL,
  filed_at    TEXT,
  approved_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS compliance_events (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id     TEXT NOT NULL,
  case_id    TEXT,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  due_date   TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','COMPLETE','WAIVED','OVERDUE')),
  notes      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_compliance_org_due ON compliance_events(org_id, due_date);
