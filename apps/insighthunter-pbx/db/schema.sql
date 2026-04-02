CREATE TABLE IF NOT EXISTS extensions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  number TEXT NOT NULL,
  name TEXT NOT NULL,
  user_id TEXT,
  voicemail_enabled INTEGER NOT NULL DEFAULT 1,
  forward_to TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(org_id, number)
);

CREATE TABLE IF NOT EXISTS phone_numbers (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  did TEXT NOT NULL UNIQUE,
  friendly_name TEXT NOT NULL,
  assigned_to TEXT,
  telnyx_number_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_phone_numbers_org ON phone_numbers(org_id);

CREATE TABLE IF NOT EXISTS call_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('inbound','outbound')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration INTEGER,
  status TEXT NOT NULL DEFAULT 'ringing',
  recording_key TEXT,
  telnyx_call_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_call_logs_org_started ON call_logs(org_id, started_at DESC);

CREATE TABLE IF NOT EXISTS voicemails (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  extension_id TEXT,
  from_number TEXT NOT NULL,
  received_at TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  transcription TEXT,
  audio_key TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_voicemails_org ON voicemails(org_id, received_at DESC);

CREATE TABLE IF NOT EXISTS ivr_config (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL UNIQUE,
  greeting TEXT NOT NULL,
  options_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pbx_settings (
  org_id TEXT PRIMARY KEY,
  business_hours_start TEXT NOT NULL DEFAULT '09:00',
  business_hours_end TEXT NOT NULL DEFAULT '17:00',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  after_hours_action TEXT NOT NULL DEFAULT 'voicemail',
  hold_music_key TEXT,
  updated_at TEXT NOT NULL
);

