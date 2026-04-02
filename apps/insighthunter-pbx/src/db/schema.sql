CREATE TABLE IF NOT EXISTS extensions (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id            TEXT NOT NULL,
  number            TEXT NOT NULL,
  name              TEXT NOT NULL,
  user_id           TEXT,
  voicemail_enabled INTEGER NOT NULL DEFAULT 1,
  is_active         INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ext_org_num ON extensions(org_id, number);

CREATE TABLE IF NOT EXISTS call_logs (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id           TEXT NOT NULL,
  from_number      TEXT,
  to_number        TEXT,
  direction        TEXT CHECK(direction IN ('inbound','outbound')),
  status           TEXT CHECK(status IN ('ringing','answered','missed','voicemail')),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  recording_r2_key TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_calls_org_date ON call_logs(org_id, created_at);

CREATE TABLE IF NOT EXISTS ivr_menus (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id         TEXT NOT NULL,
  name           TEXT NOT NULL,
  greeting_text  TEXT,
  routing_config TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS voicemails (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id        TEXT NOT NULL,
  extension_id  TEXT REFERENCES extensions(id),
  caller_number TEXT,
  r2_key        TEXT NOT NULL,
  transcription TEXT,
  listened      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
