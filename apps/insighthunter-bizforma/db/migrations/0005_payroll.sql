CREATE TABLE IF NOT EXISTS w4_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  business_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  employee_email TEXT,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contractor_1099 (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  business_id TEXT NOT NULL,
  contractor_name TEXT NOT NULL,
  tin_last4 TEXT,
  total_paid_cents INTEGER NOT NULL DEFAULT 0,
  filing_type TEXT,
  status TEXT NOT NULL DEFAULT 'tracking',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payroll_setup (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  business_id TEXT NOT NULL,
  setup_status TEXT NOT NULL DEFAULT 'not_started',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_w4_records_business_id ON w4_records(business_id);
CREATE INDEX IF NOT EXISTS idx_contractor_1099_business_id ON contractor_1099(business_id);
CREATE INDEX IF NOT EXISTS idx_payroll_setup_business_id ON payroll_setup(business_id);
