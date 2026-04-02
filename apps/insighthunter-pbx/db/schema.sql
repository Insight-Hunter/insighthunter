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
-- apps/insighthunter-pbx/schema.sql
-- InsightHunter PBX — D1 Database Schema

-- ─── Tenant PBX Config ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_pbx (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL UNIQUE,
  twilio_subaccount_sid TEXT NOT NULL,
  twilio_subaccount_auth_token TEXT NOT NULL,
  twilio_api_key_sid TEXT NOT NULL,
  twilio_api_key_secret TEXT NOT NULL,
  twilio_twiml_app_sid TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Phone Numbers ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS phone_numbers (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  twilio_sid TEXT NOT NULL UNIQUE,
  number TEXT NOT NULL,
  friendly_name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'local',
  capabilities TEXT NOT NULL DEFAULT '["voice","sms"]',
  assigned_to TEXT,
  assigned_type TEXT,
  forward_to TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  monthly_fee REAL NOT NULL DEFAULT 1.15,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_numbers_org ON phone_numbers(org_id);
CREATE INDEX IF NOT EXISTS idx_numbers_number ON phone_numbers(number);

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS extensions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT,
  extension TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  sip_username TEXT NOT NULL UNIQUE,
  sip_password_hash TEXT NOT NULL,
  sip_password_plain TEXT NOT NULL,  -- shown once at creation, then encrypted
  voicemail_enabled INTEGER NOT NULL DEFAULT 1,
  voicemail_pin TEXT NOT NULL DEFAULT '0000',
  forward_to TEXT,
  status TEXT NOT NULL DEFAULT 'offline',
  do_not_disturb INTEGER NOT NULL DEFAULT 0,
  twilio_identity TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, extension)
);

CREATE INDEX IF NOT EXISTS idx_ext_org ON extensions(org_id);
CREATE INDEX IF NOT EXISTS idx_ext_identity ON extensions(twilio_identity);

-- ─── IVR Menus ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ivr_menus (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  greeting TEXT NOT NULL,
  greeting_type TEXT NOT NULL DEFAULT 'tts',
  greeting_voice TEXT NOT NULL DEFAULT 'Polly.Joanna',
  timeout INTEGER NOT NULL DEFAULT 5,
  num_digits INTEGER NOT NULL DEFAULT 1,
  options TEXT NOT NULL DEFAULT '[]',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ivr_org ON ivr_menus(org_id);

-- ─── Call Queues ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS call_queues (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  strategy TEXT NOT NULL DEFAULT 'round-robin',
  hold_music TEXT,
  hold_announcement TEXT,
  announcement_interval INTEGER NOT NULL DEFAULT 30,
  max_wait_time INTEGER NOT NULL DEFAULT 300,
  max_wait_fallback TEXT NOT NULL DEFAULT '{"type":"voicemail"}',
  members TEXT NOT NULL DEFAULT '[]',
  twilio_queue_sid TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_queues_org ON call_queues(org_id);

-- ─── Call Records ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS call_records (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  twilio_call_sid TEXT NOT NULL UNIQUE,
  direction TEXT NOT NULL,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  extension_id TEXT,
  queue_id TEXT,
  duration INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued',
  recording_url TEXT,
  recording_sid TEXT,
  recording_duration INTEGER,
  transcription TEXT,
  voicemail INTEGER NOT NULL DEFAULT 0,
  voicemail_url TEXT,
  answered_at TEXT,
  ended_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_calls_org ON call_records(org_id);
CREATE INDEX IF NOT EXISTS idx_calls_date ON call_records(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_calls_sid ON call_records(twilio_call_sid);
CREATE INDEX IF NOT EXISTS idx_calls_ext ON call_records(extension_id);

-- ─── Messages ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  twilio_message_sid TEXT NOT NULL UNIQUE,
  thread_id TEXT NOT NULL,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  media_urls TEXT NOT NULL DEFAULT '[]',
  direction TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  extension_id TEXT,
  from_number_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_msg_org ON messages(org_id);
CREATE INDEX IF NOT EXISTS idx_msg_thread ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_msg_date ON messages(org_id, created_at);

-- ─── Message Threads ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_threads (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  our_number TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  contact_name TEXT,
  last_message TEXT NOT NULL DEFAULT '',
  last_message_at TEXT NOT NULL DEFAULT (datetime('now')),
  unread_count INTEGER NOT NULL DEFAULT 0,
  extension_id TEXT,
  UNIQUE(org_id, our_number, contact_number)
);

CREATE INDEX IF NOT EXISTS idx_threads_org ON message_threads(org_id, last_message_at);

-- ─── Conferences ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conferences (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  access_code TEXT NOT NULL,
  twilio_conference_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'idle',
  participants TEXT NOT NULL DEFAULT '[]',
  max_participants INTEGER NOT NULL DEFAULT 10,
  record_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_conf_org ON conferences(org_id);
CREATE INDEX IF NOT EXISTS idx_conf_code ON conferences(access_code);

-- ─── Voicemails ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voicemails (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  extension_id TEXT NOT NULL,
  twilio_call_sid TEXT NOT NULL,
  from_number TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  recording_url TEXT NOT NULL,
  recording_sid TEXT NOT NULL,
  transcription TEXT,
  listened INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vm_org ON voicemails(org_id);
CREATE INDEX IF NOT EXISTS idx_vm_ext ON voicemails(extension_id, listened);
