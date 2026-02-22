DROP TABLE IF EXISTS customers; 
CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    email TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'cancelled')),
    plan TEXT DEFAULT 'starter' CHECK(plan IN ('starter', 'professional', 'enterprise')),
    company_greeting TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);

-- Phone numbers owned by each customer
DROP TABLE IF EXISTS customer_numbers;
CREATE TABLE customer_numbers (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    phone_number TEXT NOT NULL,
    twilio_sid TEXT NOT NULL,
    number_type TEXT CHECK(number_type IN ('toll_free', 'local')),
    friendly_name TEXT,
    area_code TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now'))
);

-- Extensions
DROP TABLE IF EXISTS extensions;
CREATE TABLE extensions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    name TEXT NOT NULL,
    number TEXT,
    ext TEXT NOT NULL,
    forward_to TEXT,
    email TEXT,
    department TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now')),
    UNIQUE(customer_id, ext)
);

-- Call log
DROP TABLE IF EXISTS call_log;
CREATE TABLE call_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT REFERENCES customers(id),
    from_number TEXT,
    to_number TEXT,
    direction TEXT CHECK(direction IN ('inbound', 'outbound')),
    status TEXT,
    duration_seconds INTEGER,
    twilio_sid TEXT,
    started_at DATETIME,
    ended_at DATETIME
);

-- Voicemail
DROP TABLE IF EXISTS voicemails;
CREATE TABLE voicemails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT REFERENCES customers(id),
    recording_sid TEXT UNIQUE,
    from_number TEXT,
    extension TEXT,
    r2_key TEXT,
    duration_seconds INTEGER,
    transcription TEXT,
    listened INTEGER DEFAULT 0,
    listened_at DATETIME,
    created_at DATETIME
);

-- SMS log
DROP TABLE IF EXISTS sms_log;
CREATE TABLE sms_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT REFERENCES customers(id),
    from_number TEXT,
    to_number TEXT,
    body TEXT,
    direction TEXT CHECK(direction IN ('inbound', 'outbound')),
    twilio_sid TEXT,
    created_at DATETIME
);

-- Campaigns
DROP TABLE IF EXISTS campaigns;
CREATE TABLE campaigns (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES customers(id),
    name TEXT,
    message TEXT,
    recipients TEXT,
    from_number TEXT,
    status TEXT CHECK(status IN ('pending', 'scheduled', 'sending', 'sent', 'failed')),
    scheduled_at INTEGER,
    total_recipients INTEGER DEFAULT 0,
    sent INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    created_at DATETIME
);

-- SMS opt-outs
DROP TABLE IF EXISTS sms_optouts;
CREATE TABLE sms_optouts (
    customer_id TEXT NOT NULL REFERENCES customers(id),
    phone_number TEXT NOT NULL,
    opted_out_at DATETIME,
    PRIMARY KEY (customer_id, phone_number)
);

-- AI interaction log
DROP TABLE IF EXISTS ai_interactions;
CREATE TABLE ai_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT REFERENCES customers(id),
    call_sid TEXT,
    from_number TEXT,
    speech_input TEXT,
    routing_decision TEXT,
    created_at DATETIME
);

-- Agent handoff requests
DROP TABLE IF EXISTS agent_handoffs;
CREATE TABLE agent_handoffs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT REFERENCES customers(id),
    from_number TEXT,
    to_number TEXT,
    reason TEXT,
    resolved INTEGER DEFAULT 0,
    created_at DATETIME
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_api_key ON customers(api_key);
CREATE INDEX IF NOT EXISTS idx_customer_numbers_cust ON customer_numbers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_numbers_phone ON customer_numbers(phone_number);
CREATE INDEX IF NOT EXISTS idx_extensions_customer ON extensions(customer_id);
CREATE INDEX IF NOT EXISTS idx_extensions_number ON extensions(number);
CREATE INDEX IF NOT EXISTS idx_call_log_customer ON call_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_call_log_started ON call_log(started_at);
CREATE INDEX IF NOT EXISTS idx_voicemails_customer ON voicemails(customer_id);
CREATE INDEX IF NOT EXISTS idx_voicemails_listened ON voicemails(listened);
CREATE INDEX IF NOT EXISTS idx_sms_log_customer ON sms_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_sms_log_created ON sms_log(created_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_customer ON campaigns(customer_id);
