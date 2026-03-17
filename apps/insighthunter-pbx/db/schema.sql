-- apps/insighthunter-pbx/db/schema.sql

CREATE TABLE IF NOT EXISTS pbx_numbers (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  phone_number  TEXT NOT NULL UNIQUE,
  friendly_name TEXT NOT NULL DEFAULT '',
  twilio_sid    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active', -- active | released
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pbx_calls (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  direction     TEXT NOT NULL,   -- inbound | outbound
  from_number   TEXT NOT NULL,
  to_number     TEXT NOT NULL,
  call_sid      TEXT,
  duration      INTEGER DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'ringing',
  recording_url TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pbx_voicemails (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  from_number     TEXT NOT NULL,
  recording_url   TEXT NOT NULL,
  recording_sid   TEXT,
  duration        INTEGER DEFAULT 0,
  transcription   TEXT,
  listened        INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pbx_sms (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  direction     TEXT NOT NULL,   -- inbound | outbound
  from_number   TEXT NOT NULL,
  to_number     TEXT NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  twilio_sid    TEXT,
  status        TEXT NOT NULL DEFAULT 'received',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pbx_routes (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  label         TEXT NOT NULL,   -- e.g. "sales", "support"
  forward_to    TEXT NOT NULL,   -- phone number to forward to
  description   TEXT DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, label)
);

CREATE INDEX IF NOT EXISTS idx_pbx_calls_user     ON pbx_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_pbx_vmail_user     ON pbx_voicemails(user_id);
CREATE INDEX IF NOT EXISTS idx_pbx_sms_user       ON pbx_sms(user_id);
CREATE INDEX IF NOT EXISTS idx_pbx_routes_user    ON pbx_routes(user_id);
