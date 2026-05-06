-- Master schema: all tables have org_id as first column
-- Bookkeeping
CREATE TABLE IF NOT EXISTS bk_accounts (
  org_id      TEXT NOT NULL,
  id          TEXT NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK(type IN ('asset','liability','equity','revenue','expense')),
  code        TEXT,
  parent_id   TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (org_id, id)
);

CREATE TABLE IF NOT EXISTS bk_transactions (
  org_id      TEXT NOT NULL,
  id          TEXT NOT NULL,
  date        TEXT NOT NULL,
  description TEXT NOT NULL,
  amount      REAL NOT NULL,
  account_id  TEXT NOT NULL,
  category    TEXT,
  source      TEXT,
  reconciled  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (org_id, id)
);
CREATE INDEX IF NOT EXISTS idx_bk_tx_org ON bk_transactions(org_id, date);

-- Payroll
CREATE TABLE IF NOT EXISTS pr_employees (
  org_id     TEXT NOT NULL,
  id         TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  email      TEXT,
  ssn_last4  TEXT,
  status     TEXT NOT NULL DEFAULT 'active',
  start_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (org_id, id)
);
CREATE INDEX IF NOT EXISTS idx_pr_emp_org ON pr_employees(org_id);

-- Scout CRM
CREATE TABLE IF NOT EXISTS sc_leads (
  org_id     TEXT NOT NULL,
  id         TEXT NOT NULL,
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  status     TEXT NOT NULL DEFAULT 'new',
  score      INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (org_id, id)
);
CREATE INDEX IF NOT EXISTS idx_sc_leads_org ON sc_leads(org_id, status);
