CREATE TABLE IF NOT EXISTS formation_documents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  business_id TEXT NOT NULL,
  formation_case_id TEXT,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (formation_case_id) REFERENCES formation_cases(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lego_form_templates (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  schema_json TEXT NOT NULL,
  is_system_template INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_formation_documents_business_id ON formation_documents(business_id);
CREATE INDEX IF NOT EXISTS idx_lego_form_templates_tenant_id ON lego_form_templates(tenant_id);
