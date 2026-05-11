CREATE TABLE IF NOT EXISTS state_requirements (
  state_code TEXT PRIMARY KEY,
  state_name TEXT NOT NULL,
  llc_fee_cents INTEGER,
  corp_fee_cents INTEGER,
  annual_report_required INTEGER NOT NULL DEFAULT 1,
  annual_report_fee_cents INTEGER,
  registered_agent_required INTEGER NOT NULL DEFAULT 1,
  sos_url TEXT,
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
