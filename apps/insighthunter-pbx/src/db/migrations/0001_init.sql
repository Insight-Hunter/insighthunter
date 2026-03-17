CREATE TABLE IF NOT EXISTS pbx_numbers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  friendly_name TEXT,
  twilio_sid TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- e.g., active, released
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS pbx_calls (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  direction TEXT NOT NULL, -- inbound, outbound
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  call_sid TEXT NOT NULL,
  status TEXT NOT NULL, -- ringing, in-progress, completed, failed
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pbx_voicemails (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  from_number TEXT NOT NULL,
  recording_url TEXT NOT NULL,
  recording_sid TEXT NOT NULL,
  duration INTEGER NOT NULL,
  transcription TEXT,
  listened INTEGER NOT NULL DEFAULT 0, -- 0 or 1
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pbx_sms (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  direction TEXT NOT NULL, -- inbound, outbound
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT NOT NULL,
  twilio_sid TEXT, -- only for outbound
  status TEXT NOT NULL, -- received, sent, failed
  opt_keyword TEXT, -- START, STOP, HELP
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pbx_routes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  label TEXT NOT NULL UNIQUE, -- e.g., 'sales', 'support'
  forward_to TEXT NOT NULL, -- phone number or SIP URI
  description TEXT,
  created_at TEXT NOT NULL
);

-- TCPA Compliance: track user consent for SMS
CREATE TABLE IF NOT EXISTS sms_consent (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL, -- active, opted_out
  consent_type TEXT NOT NULL, -- web_form, import, sms_keyword
  message_type TEXT NOT NULL, -- transactional, promotional, mixed
  program_name TEXT,
  opt_in_message TEXT,
  consented_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, phone_number)
);
