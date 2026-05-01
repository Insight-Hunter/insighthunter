CREATE TABLE IF NOT EXISTS compliance_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  business_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT NOT NULL DEFAULT 'system',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS renewal_schedule (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  business_id TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  filing_name TEXT NOT NULL,
  frequency TEXT NOT NULL,
  next_due_date TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_compliance_events_business_id ON compliance_events(business_id);
CREATE INDEX IF NOT EXISTS idx_compliance_events_due_date ON compliance_events(due_date);
CREATE INDEX IF NOT EXISTS idx_renewal_schedule_business_id ON renewal_schedule(business_id);
