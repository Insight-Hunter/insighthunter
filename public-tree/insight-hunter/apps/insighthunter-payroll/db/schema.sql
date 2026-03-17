-- apps/insighthunter-payroll/db/schema.sql

CREATE TABLE IF NOT EXISTS payroll_employees (
  id                     TEXT PRIMARY KEY,
  user_id                TEXT NOT NULL,
  first_name             TEXT NOT NULL,
  last_name              TEXT NOT NULL,
  email                  TEXT NOT NULL,
  employment_type        TEXT NOT NULL DEFAULT 'w2',   -- w2 | 1099
  pay_type               TEXT NOT NULL DEFAULT 'salary', -- salary | hourly
  pay_rate               REAL NOT NULL DEFAULT 0,       -- annual salary OR hourly rate
  filing_status          TEXT NOT NULL DEFAULT 'single',
  allowances             INTEGER NOT NULL DEFAULT 0,
  additional_withholding REAL NOT NULL DEFAULT 0,
  state_code             TEXT NOT NULL DEFAULT 'GA',
  deductions             TEXT NOT NULL DEFAULT '[]',   -- JSON Deduction[]
  active                 INTEGER NOT NULL DEFAULT 1,
  hired_at               TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL,
  pay_date         TEXT NOT NULL,
  pay_period_start TEXT NOT NULL,
  pay_period_end   TEXT NOT NULL,
  employee_count   INTEGER NOT NULL DEFAULT 0,
  total_gross      REAL NOT NULL DEFAULT 0,
  total_net        REAL NOT NULL DEFAULT 0,
  total_taxes      REAL NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'draft',  -- draft | approved | voided
  approved_at      TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payroll_stubs (
  id                   TEXT PRIMARY KEY,
  run_id               TEXT NOT NULL REFERENCES payroll_runs(id),
  employee_id          TEXT NOT NULL REFERENCES payroll_employees(id),
  pay_date             TEXT NOT NULL,
  gross_pay            REAL NOT NULL DEFAULT 0,
  federal_tax          REAL NOT NULL DEFAULT 0,
  ss_tax               REAL NOT NULL DEFAULT 0,
  medicare_tax         REAL NOT NULL DEFAULT 0,
  state_tax            REAL NOT NULL DEFAULT 0,
  total_taxes          REAL NOT NULL DEFAULT 0,
  pre_tax_deductions   REAL NOT NULL DEFAULT 0,
  post_tax_deductions  REAL NOT NULL DEFAULT 0,
  net_pay              REAL NOT NULL DEFAULT 0,
  employer_ss          REAL NOT NULL DEFAULT 0,
  employer_medicare    REAL NOT NULL DEFAULT 0,
  calc_detail          TEXT NOT NULL DEFAULT '{}',  -- full JSON breakdown
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payroll_emp_user  ON payroll_employees(user_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_user ON payroll_runs(user_id,pay_date);
CREATE INDEX IF NOT EXISTS idx_payroll_stubs_run ON payroll_stubs(run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_stubs_emp ON payroll_stubs(employee_id);
