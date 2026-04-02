CREATE TABLE IF NOT EXISTS employees (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id           TEXT NOT NULL,
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  email            TEXT NOT NULL,
  ssn_last4        TEXT,
  employment_type  TEXT CHECK(employment_type IN ('fulltime','parttime','contractor')),
  pay_type         TEXT CHECK(pay_type IN ('hourly','salary')),
  pay_rate         REAL NOT NULL,
  hours_per_week   REAL NOT NULL DEFAULT 40,
  filing_status    TEXT CHECK(filing_status IN ('single','married')),
  federal_allowances INTEGER NOT NULL DEFAULT 1,
  state            TEXT,
  is_active        INTEGER NOT NULL DEFAULT 1,
  start_date       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_emp_org ON employees(org_id);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id       TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end   TEXT NOT NULL,
  pay_date     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PROCESSING','COMPLETE','FAILED')),
  total_gross  REAL NOT NULL DEFAULT 0,
  total_taxes  REAL NOT NULL DEFAULT 0,
  total_net    REAL NOT NULL DEFAULT 0,
  created_by   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_runs_org_status ON payroll_runs(org_id, status);

CREATE TABLE IF NOT EXISTS payroll_line_items (
  id                 TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  run_id             TEXT NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id        TEXT NOT NULL REFERENCES employees(id),
  gross_pay          REAL NOT NULL,
  federal_income_tax REAL NOT NULL DEFAULT 0,
  state_income_tax   REAL NOT NULL DEFAULT 0,
  social_security    REAL NOT NULL DEFAULT 0,
  medicare           REAL NOT NULL DEFAULT 0,
  other_deductions   REAL NOT NULL DEFAULT 0,
  net_pay            REAL NOT NULL,
  hours_worked       REAL,
  pay_stub_r2_key    TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lines_run ON payroll_line_items(run_id);
CREATE INDEX IF NOT EXISTS idx_lines_emp ON payroll_line_items(employee_id);
