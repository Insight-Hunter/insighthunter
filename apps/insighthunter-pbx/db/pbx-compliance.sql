-- Compliance schema additions — run after pbx-schema.sql

-- SMS consent records (TCPA audit trail)
CREATE TABLE IF NOT EXISTS sms_consent (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  phone_number    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',  -- active | opted_out | pending
  consent_type    TEXT NOT NULL,  -- web_form | keyword | verbal | import
  message_type    TEXT DEFAULT 'mixed',  -- transactional | marketing | mixed
  program_name    TEXT DEFAULT '',
  opt_in_message  TEXT DEFAULT '',   -- exact text shown to user at opt-in
  ip_address      TEXT,
  form_url        TEXT,
  consented_at    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Compliance audit log (immutable append-only)
CREATE TABLE IF NOT EXISTS pbx_audit_log (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  event      TEXT NOT NULL,  -- sms_sent | sms_opt_out | sms_opt_in | consent_recorded | ...
  data       TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- DNC (Do Not Call) list — for voice compliance
CREATE TABLE IF NOT EXISTS pbx_dnc (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  reason       TEXT DEFAULT '',
  added_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, phone_number)
);

-- Add opt_keyword column to pbx_sms if not exists
ALTER TABLE pbx_sms ADD COLUMN opt_keyword TEXT;

CREATE INDEX IF NOT EXISTS idx_consent_user_phone ON sms_consent(user_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_audit_user         ON pbx_audit_log(user_id, event);
CREATE INDEX IF NOT EXISTS idx_dnc_user_phone     ON pbx_dnc(user_id, phone_number);
