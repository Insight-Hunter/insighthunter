CREATE TABLE IF NOT EXISTS formation_cases (
  id TEXT PRIMARY KEY, org_id TEXT NOT NULL, user_id TEXT NOT NULL,
  business_name TEXT NOT NULL, entity_type TEXT, status TEXT NOT NULL DEFAULT 'QUESTIONNAIRE',
  state TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_formation_cases_org ON formation_cases(org_id);
