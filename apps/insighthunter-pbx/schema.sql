
CREATE TABLE IF NOT EXISTS extensions (
id TEXT PRIMARY KEY,
name TEXT NOT NULL,
number TEXT,         
ext TEXT UNIQUE NOT NULL,  
forward_to TEXT,        Optional external phone number
email TEXT,
department TEXT,
active INTEGER DEFAULT 1,
created_at DATETIME DEFAULT (datetime("now"))
);

CREATE TABLE IF NOT EXISTS call_log (
id INTEGER PRIMARY KEY AUTOINCREMENT,
from_number TEXT,
to_number TEXT,
direction TEXT CHECK(direction IN ("inbound","outbound")),
status TEXT,
duration_seconds INTEGER,
twilio_sid TEXT,
started_at DATETIME,
ended_at DATETIME
);

CREATE TABLE IF NOT EXISTS voicemails (
id INTEGER PRIMARY KEY AUTOINCREMENT,
recording_sid TEXT UNIQUE,
from_number TEXT,
extension TEXT,
r2_key TEXT,          // Key in R2 bucket
duration_seconds INTEGER,
transcription TEXT,   // AI transcription
listened INTEGER DEFAULT 0,
listened_at DATETIME,
created_at DATETIME
);

CREATE TABLE IF NOT EXISTS sms_log (
id INTEGER PRIMARY KEY AUTOINCREMENT,
from_number TEXT,
to_number TEXT,
body TEXT,
direction TEXT CHECK(direction IN ("inbound","outbound")),
twilio_sid TEXT,
created_at DATETIME
);

CREATE TABLE IF NOT EXISTS campaigns (
id TEXT PRIMARY KEY,
name TEXT,
message TEXT,
recipients TEXT,      // JSON array of phone numbers
from_number TEXT,
status TEXT CHECK(status IN ("pending","scheduled","sending","sent","failed")),
scheduled_at INTEGER,
total_recipients INTEGER DEFAULT 0,
sent INTEGER DEFAULT 0,
failed INTEGER DEFAULT 0,
created_at DATETIME
);

CREATE TABLE IF NOT EXISTS sms_optouts (
phone_number TEXT PRIMARY KEY,
opted_out_at DATETIME
);

CREATE TABLE IF NOT EXISTS ai_interactions (
id INTEGER PRIMARY KEY AUTOINCREMENT,
call_sid TEXT,
from_number TEXT,
speech_input TEXT,
routing_decision TEXT,  // JSON
created_at DATETIME
);

CREATE TABLE IF NOT EXISTS agent_handoffs (
id INTEGER PRIMARY KEY AUTOINCREMENT,
from_number TEXT,
to_number TEXT,
reason TEXT,
resolved INTEGER DEFAULT 0,
created_at DATETIME
);

// Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_calls_started ON call_log(started_at);
CREATE INDEX IF NOT EXISTS idx_voicemails_ext ON voicemails(extension);
CREATE INDEX IF NOT EXISTS idx_voicemails_listened ON voicemails(listened);
CREATE INDEX IF NOT EXISTS idx_sms_log_created ON sms_log(created_at);
CREATE INDEX IF NOT EXISTS idx_extensions_ext ON extensions(ext);
CREATE INDEX IF NOT EXISTS idx_extensions_number ON extensions(number);