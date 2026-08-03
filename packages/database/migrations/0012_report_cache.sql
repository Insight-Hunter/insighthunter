-- 0012_report_cache.sql
-- Optional report snapshot cache — stores pre-computed report JSON for fast re-reads.
-- Reports Worker can write here after generation; TTL enforced at app layer.

CREATE TABLE IF NOT EXISTS report_cache (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_type  TEXT NOT NULL,  -- trial-balance | profit-loss | balance-sheet | cash-flow | ar-aging
  params_hash  TEXT NOT NULL,  -- hash of from/to/as_of params for cache key
  payload_json TEXT NOT NULL,  -- serialized report data
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at   TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_report_cache_key ON report_cache(org_id, report_type, params_hash);
CREATE INDEX IF NOT EXISTS idx_report_cache_org       ON report_cache(org_id, generated_at DESC);
