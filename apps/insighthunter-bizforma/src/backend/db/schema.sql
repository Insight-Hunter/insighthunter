CREATE TABLE IF NOT EXISTS formation_cases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  entity_type TEXT,
  state TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
