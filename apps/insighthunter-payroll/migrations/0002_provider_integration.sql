ALTER TABLE payroll_runs ADD COLUMN provider_run_id TEXT;
ALTER TABLE payroll_run_lines ADD COLUMN provider_employee_id TEXT;
ALTER TABLE employees ADD COLUMN provider_employee_id TEXT;
ALTER TABLE employees ADD COLUMN provider_onboarding_status TEXT DEFAULT 'not_started';
CREATE INDEX idx_payroll_runs_provider_id ON payroll_runs(provider_run_id);
