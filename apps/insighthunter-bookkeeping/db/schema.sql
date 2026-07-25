CREATE TABLE IF NOT EXISTS import_sessions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'created',
  file_name TEXT NOT NULL,
  object_key TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS import_rows (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  row_index INTEGER NOT NULL,
  source_date TEXT,
  source_description TEXT,
  source_amount REAL,
  normalized_description TEXT,
  normalized_amount REAL,
  normalized_date TEXT,
  category TEXT,
  confidence REAL,
  review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES import_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS import_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  match_type TEXT NOT NULL,
  match_value TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS review_actions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  row_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  payload TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES import_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (row_id) REFERENCES import_rows(id) ON DELETE CASCADE
);
