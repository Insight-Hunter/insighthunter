-- Tenant-scoped departments and internal extensions
-- (docs/insight-pbx-master-prompt.md §4.1, §4.2).
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(org_id, name)
);

-- An extension is unique per tenant. user_id is the platform user for
-- kind='user'; department_id links shared/department extensions.
CREATE TABLE IF NOT EXISTS extensions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id TEXT NOT NULL,
  extension TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('user', 'department', 'queue', 'voicemail')),
  display_name TEXT NOT NULL,
  user_id TEXT,
  department_id INTEGER REFERENCES departments(id),
  created_at TEXT NOT NULL,
  UNIQUE(org_id, extension)
);
CREATE INDEX IF NOT EXISTS idx_extensions_department ON extensions(department_id);
