-- Migration: 0006_bizforma
-- Formation cases, compliance events, and documents for insighthunter-bizforma

CREATE TABLE IF NOT EXISTS formation_cases (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('LLC', 'S-CORP', 'C-CORP', 'SOLE_PROP', 'PARTNERSHIP', 'NONPROFIT')),
  business_name TEXT NOT NULL,
  state TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'filed', 'approved', 'rejected', 'cancelled')),
  wizard_step INTEGER NOT NULL DEFAULT 1,
  wizard_data TEXT NOT NULL DEFAULT '{}', -- JSON blob of step data
  ein TEXT,
  sos_filing_number TEXT,
  registered_agent TEXT,
  principal_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  filed_at TEXT,
  approved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_formation_cases_tenant ON formation_cases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_formation_cases_user ON formation_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_formation_cases_status ON formation_cases(status);

CREATE TABLE IF NOT EXISTS compliance_events (
  id TEXT PRIMARY KEY,
  formation_case_id TEXT NOT NULL REFERENCES formation_cases(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'annual_report', 'tax_filing', 'registered_agent_renewal', 'license_renewal'
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'waived')),
  reminder_sent INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_compliance_events_case ON compliance_events(formation_case_id);
CREATE INDEX IF NOT EXISTS idx_compliance_events_due ON compliance_events(due_date);
CREATE INDEX IF NOT EXISTS idx_compliance_events_status ON compliance_events(status);

CREATE TABLE IF NOT EXISTS bizforma_documents (
  id TEXT PRIMARY KEY,
  formation_case_id TEXT NOT NULL REFERENCES formation_cases(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  document_type TEXT NOT NULL, -- 'articles_of_organization', 'operating_agreement', 'ein_confirmation', 'sos_receipt', 'custom'
  file_name TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE, -- R2 object key
  content_type TEXT NOT NULL DEFAULT 'application/pdf',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('pending', 'uploaded', 'processing', 'ready', 'error')),
  generated INTEGER NOT NULL DEFAULT 0, -- 1 = AI/system generated, 0 = user uploaded
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bizforma_documents_case ON bizforma_documents(formation_case_id);
CREATE INDEX IF NOT EXISTS idx_bizforma_documents_tenant ON bizforma_documents(tenant_id);

CREATE TABLE IF NOT EXISTS formation_wizard_sessions (
  id TEXT PRIMARY KEY,
  formation_case_id TEXT REFERENCES formation_cases(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  session_data TEXT NOT NULL DEFAULT '{}', -- full wizard state JSON
  current_step INTEGER NOT NULL DEFAULT 1,
  total_steps INTEGER NOT NULL DEFAULT 11,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wizard_sessions_user ON formation_wizard_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_wizard_sessions_case ON formation_wizard_sessions(formation_case_id);
