CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL,
  plan TEXT NOT NULL,
  organization_name TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
