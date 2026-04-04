CREATE TABLE IF NOT EXISTS conversations (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id     TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  title      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_conv_org ON conversations(org_id);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
  content         TEXT NOT NULL,
  tokens_used     INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_msgs_conv ON messages(conversation_id);

CREATE TABLE IF NOT EXISTS financial_docs (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id     TEXT NOT NULL,
  type       TEXT CHECK(type IN ('pl','balance_sheet','trial_balance','report')),
  period     TEXT,
  content    TEXT NOT NULL,
  vector_id  TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
