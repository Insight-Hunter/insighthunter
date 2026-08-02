-- 0009_org_health_metrics.sql
-- Stores the 6-factor business health score metrics per org.
-- Written by apps/insighthunter-insights GET /api/health-score
-- Read by apps/insighthunter-main GET /api/dashboard

CREATE TABLE IF NOT EXISTS org_health_metrics (
  id           TEXT    NOT NULL,
  org_id       TEXT    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_key   TEXT    NOT NULL, -- cash_position | revenue_growth | debt_risk | payroll_burden | customer_concentration | compliance_status
  metric_value REAL    NOT NULL,
  recorded_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, metric_key)     -- upserted on each compute; one row per metric per org
);

CREATE INDEX IF NOT EXISTS idx_health_org ON org_health_metrics(org_id);
CREATE INDEX IF NOT EXISTS idx_health_recorded ON org_health_metrics(recorded_at DESC);
