-- 0013_payroll.sql
-- Payroll module: employees, payroll runs, run line items, employee deductions.

-- Employee records
CREATE TABLE IF NOT EXISTS employees (
  id             TEXT    PRIMARY KEY,
  org_id         TEXT    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name           TEXT    NOT NULL,
  email          TEXT,
  pay_type       TEXT    NOT NULL DEFAULT 'salary', -- salary | hourly
  pay_rate       REAL    NOT NULL DEFAULT 0,         -- annual salary OR hourly rate
  state          TEXT    NOT NULL DEFAULT 'CA',      -- 2-letter state for withholding
  filing_status  TEXT    NOT NULL DEFAULT 'single',  -- single | married
  allowances     INTEGER NOT NULL DEFAULT 0,
  status         TEXT    NOT NULL DEFAULT 'active',  -- active | inactive
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Per-employee deduction templates
CREATE TABLE IF NOT EXISTS employee_deductions (
  id           TEXT    PRIMARY KEY,
  employee_id  TEXT    NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type         TEXT    NOT NULL, -- health_insurance | 401k | dental | vision | garnishment | other
  amount       REAL    NOT NULL,
  is_percent   INTEGER NOT NULL DEFAULT 0, -- 1 = % of gross, 0 = flat dollar
  description  TEXT,
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Payroll run headers
CREATE TABLE IF NOT EXISTS payroll_runs (
  id             TEXT    PRIMARY KEY,
  org_id         TEXT    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start   TEXT    NOT NULL,
  period_end     TEXT    NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'draft', -- draft | pending | approved | void
  total_gross    REAL    NOT NULL DEFAULT 0,
  total_net      REAL    NOT NULL DEFAULT 0,
  employee_count INTEGER NOT NULL DEFAULT 0,
  approved_at    TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Payroll run line items — one row per employee per run
CREATE TABLE IF NOT EXISTS payroll_run_lines (
  id               TEXT    PRIMARY KEY,
  run_id           TEXT    NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id      TEXT    NOT NULL REFERENCES employees(id),
  gross_pay        REAL    NOT NULL DEFAULT 0,
  federal_tax      REAL    NOT NULL DEFAULT 0,
  state_tax        REAL    NOT NULL DEFAULT 0,
  social_security  REAL    NOT NULL DEFAULT 0,
  medicare         REAL    NOT NULL DEFAULT 0,
  other_deductions REAL    NOT NULL DEFAULT 0,
  net_pay          REAL    NOT NULL DEFAULT 0,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employees_org       ON employees(org_id, status);
CREATE INDEX IF NOT EXISTS idx_emp_deductions_emp  ON employee_deductions(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_org    ON payroll_runs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_lines_run   ON payroll_run_lines(run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_lines_emp   ON payroll_run_lines(employee_id);
