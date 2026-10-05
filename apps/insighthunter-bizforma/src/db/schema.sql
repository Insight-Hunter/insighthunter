PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS bizforma_cases (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  state TEXT NOT NULL,
  business_name TEXT NOT NULL,
  registered_agent TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cases_org ON bizforma_cases(org_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON bizforma_cases(status);

CREATE TABLE IF NOT EXISTS bizforma_wizard_sessions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 1,
  completed INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wizard_org ON bizforma_wizard_sessions(org_id);

CREATE TABLE IF NOT EXISTS bizforma_documents (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  filename TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  uploaded_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES bizforma_cases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_documents_case ON bizforma_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_org ON bizforma_documents(org_id);

CREATE TABLE IF NOT EXISTS bizforma_compliance_events (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES bizforma_cases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_compliance_org ON bizforma_compliance_events(org_id);
CREATE INDEX IF NOT EXISTS idx_compliance_due ON bizforma_compliance_events(due_date);

CREATE TABLE IF NOT EXISTS bizforma_ein_applications (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  ss4_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES bizforma_cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bizforma_licenses (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  issuing_authority TEXT,
  renewal_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES bizforma_cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bizforma_tasks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  case_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  assigned_to TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES bizforma_cases(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_org ON bizforma_tasks(org_id);

CREATE TABLE IF NOT EXISTS bizforma_signatures (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  document_id TEXT,
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  signed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES bizforma_cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bizforma_registered_agents (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  agent_email TEXT,
  agent_phone TEXT,
  service_status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES bizforma_cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bizforma_maintenance_events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES bizforma_cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bizforma_reminder_deliveries (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bizforma_audit_events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON bizforma_audit_events(org_id);
