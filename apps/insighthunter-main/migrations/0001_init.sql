-- insighthunter-main D1 schema

CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id                TEXT PRIMARY KEY,
  owner_email       TEXT NOT NULL,
  plan              TEXT NOT NULL,
  organization_name TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',
  created_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_onboarding_email  ON onboarding_sessions (owner_email);
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON onboarding_sessions (status);
