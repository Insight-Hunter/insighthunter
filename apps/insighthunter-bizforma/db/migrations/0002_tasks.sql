CREATE TABLE IF NOT EXISTS formation_tasks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  formation_case_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (formation_case_id) REFERENCES formation_cases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_formation_tasks_case_id ON formation_tasks(formation_case_id);
CREATE INDEX IF NOT EXISTS idx_formation_tasks_status ON formation_tasks(status);
