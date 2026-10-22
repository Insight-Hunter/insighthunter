-- Call flows with immutable published versions (docs/insight-pbx-master-prompt.md §4.3).
-- A flow has at most one draft version; publishing freezes it. Rollback
-- repoints published_version at an earlier published version.
CREATE TABLE IF NOT EXISTS call_flows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  published_version INTEGER,
  created_at TEXT NOT NULL,
  UNIQUE(org_id, name)
);

CREATE TABLE IF NOT EXISTS call_flow_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id TEXT NOT NULL,
  flow_id INTEGER NOT NULL REFERENCES call_flows(id),
  version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  definition TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  published_at TEXT,
  UNIQUE(flow_id, version)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_call_flow_one_draft
  ON call_flow_versions(flow_id) WHERE status = 'draft';
CREATE INDEX IF NOT EXISTS idx_call_flow_versions_org ON call_flow_versions(org_id, flow_id);
