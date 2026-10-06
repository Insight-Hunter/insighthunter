-- apps/insighthunter-pbx/src/backend/db/schema.sql
--
-- NON-AUTHORITATIVE reference snapshot of the schema that is actually live,
-- for readability when navigating the backend/ source tree per
-- docs/file-structure.md. This file is NOT applied by Wrangler and is NOT
-- read by any application code.
--
-- The authoritative, applied migrations live at ../../../migrations/
-- (0001_init.sql, 0002_compliance_and_ledger.sql, ...). If this file and
-- that directory ever disagree, the migrations directory wins — update this
-- file to match it, never the reverse.
--
-- See ./migrations/README.md for why planned-but-unbuilt tables (call
-- flows, queues, conversations, etc.) are tracked as separate stub files
-- rather than appended here.

CREATE TABLE IF NOT EXISTS voicemails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id TEXT NOT NULL,
  from_number TEXT NOT NULL,
  recording_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_voicemails_org ON voicemails(org_id);

CREATE TABLE IF NOT EXISTS sms_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id TEXT NOT NULL,
  to_number TEXT NOT NULL,
  from_number TEXT NOT NULL,
  body TEXT NOT NULL,
  twilio_sid TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sms_log_org ON sms_log(org_id);

CREATE TABLE IF NOT EXISTS phone_numbers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id TEXT NOT NULL,
  phone_number TEXT NOT NULL UNIQUE,
  label TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_org ON phone_numbers(org_id);

CREATE TABLE IF NOT EXISTS message_suppressions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'stop',
  created_at TEXT NOT NULL,
  UNIQUE(org_id, phone_number)
);
CREATE INDEX IF NOT EXISTS idx_message_suppressions_org ON message_suppressions(org_id, phone_number);

CREATE TABLE IF NOT EXISTS sms_inbound_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id TEXT NOT NULL,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT NOT NULL,
  twilio_sid TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sms_inbound_log_org ON sms_inbound_log(org_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id TEXT NOT NULL,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_log_org ON audit_log(org_id, created_at);

CREATE TABLE IF NOT EXISTS usage_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'twilio',
  occurred_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_usage_ledger_org ON usage_ledger(org_id, occurred_at);

CREATE TABLE IF NOT EXISTS processed_webhook_events (
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  received_at TEXT NOT NULL,
  PRIMARY KEY (provider, event_id)
);
