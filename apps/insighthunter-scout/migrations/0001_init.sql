CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  lead_id TEXT NOT NULL REFERENCES leads(id),
  amount REAL NOT NULL,
  stage TEXT NOT NULL DEFAULT 'prospecting',
  created_at TEXT NOT NULL
);
CREATE INDEX idx_leads_org ON leads(org_id);
CREATE INDEX idx_deals_org ON deals(org_id);
