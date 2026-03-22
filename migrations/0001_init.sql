-- db/migrations/0001_pbx.sql

CREATE TABLE IF NOT EXISTS pbx_extensions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  org_id TEXT NOT NULL,
  extension_number TEXT NOT NULL,         -- e.g. "101"
  display_name TEXT NOT NULL,
  forward_to TEXT,                        -- E.164 phone number or SIP
  voicemail_enabled INTEGER DEFAULT 1,
  greeting_url TEXT,                      -- R2 URL for custom greeting
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(org_id, extension_number)
);

CREATE TABLE IF NOT EXISTS pbx_call_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  org_id TEXT NOT NULL,
  call_sid TEXT UNIQUE NOT NULL,          -- Twilio CallSid
  direction TEXT NOT NULL,               -- 'inbound' | 'outbound'
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  extension_id TEXT,
  status TEXT NOT NULL,                  -- 'completed'|'busy'|'no-answer'|'failed'|'missed'
  duration_seconds INTEGER DEFAULT 0,
  recording_url TEXT,
  recording_sid TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  FOREIGN KEY (extension_id) REFERENCES pbx_extensions(id)
);

CREATE TABLE IF NOT EXISTS pbx_voicemails (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  org_id TEXT NOT NULL,
  call_log_id TEXT NOT NULL,
  extension_id TEXT,
  recording_url TEXT NOT NULL,
  transcription TEXT,
  duration_seconds INTEGER DEFAULT 0,
  is_read INTEGER DEFAULT 0,
  caller_number TEXT NOT NULL,
  received_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (call_log_id) REFERENCES pbx_call_logs(id),
  FOREIGN KEY (extension_id) REFERENCES pbx_extensions(id)
);

CREATE TABLE IF NOT EXISTS pbx_ivr_configs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  org_id TEXT NOT NULL UNIQUE,
  welcome_message TEXT DEFAULT 'Thank you for calling. Please listen to the following options.',
  menu_items TEXT NOT NULL DEFAULT '[]',   -- JSON array of {digit, label, action, target}
  timeout_seconds INTEGER DEFAULT 5,
  max_retries INTEGER DEFAULT 3,
  after_hours_message TEXT,
  business_hours TEXT,                    -- JSON {mon-fri: "09:00-17:00", ...}
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_call_logs_org ON pbx_call_logs(org_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_voicemails_org ON pbx_voicemails(org_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_extensions_org ON pbx_extensions(org_id);
