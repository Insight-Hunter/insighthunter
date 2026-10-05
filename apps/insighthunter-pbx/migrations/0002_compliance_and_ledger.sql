-- Trusted number-to-tenant mapping. Inbound Twilio webhooks must resolve the
-- tenant from this table (keyed by the Twilio "To" number) rather than from
-- a caller- or URL-supplied value alone.
CREATE TABLE IF NOT EXISTS phone_numbers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id TEXT NOT NULL,
  phone_number TEXT NOT NULL UNIQUE,
  label TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_org ON phone_numbers(org_id);

-- SMS/MMS consent and suppression (STOP/START/HELP) per tenant + recipient.
-- Required before any outbound message may be sent (Definition of Done:
-- "SMS opt-out is enforced").
CREATE TABLE IF NOT EXISTS message_suppressions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'stop',
  created_at TEXT NOT NULL,
  UNIQUE(org_id, phone_number)
);
CREATE INDEX IF NOT EXISTS idx_message_suppressions_org ON message_suppressions(org_id, phone_number);

-- Inbound two-way SMS log (separate from outbound sms_log rows written by
-- the authenticated send endpoint).
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

-- Tenant-bound audit trail for security-sensitive actions (message/call
-- access, voicemail access, provider webhook ingestion, etc).
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

-- Append-only usage ledger. Provider (Twilio) usage/events are inputs to
-- this ledger; the ledger itself, not the vendor record, is the billing
-- source of truth for Insight Hunter.
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

-- Webhook delivery dedupe (provider webhooks must be idempotent; Twilio may
-- redeliver on timeout).
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  received_at TEXT NOT NULL,
  PRIMARY KEY (provider, event_id)
);
