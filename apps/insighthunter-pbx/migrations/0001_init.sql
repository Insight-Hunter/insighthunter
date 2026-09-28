CREATE TABLE IF NOT EXISTS voicemails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id TEXT NOT NULL,
  from_number TEXT NOT NULL,
  recording_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sms_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id TEXT NOT NULL,
  to_number TEXT NOT NULL,
  from_number TEXT NOT NULL,
  body TEXT NOT NULL,
  twilio_sid TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_voicemails_org ON voicemails(org_id);
CREATE INDEX idx_sms_log_org ON sms_log(org_id);
