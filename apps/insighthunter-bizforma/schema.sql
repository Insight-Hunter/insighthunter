-- BizForma D1 Database Schema
-- Run: wrangler d1 execute BIZFORMA_DB --file=schema.sql

-- Business name availability check cache
CREATE TABLE IF NOT EXISTS name_checks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL UNIQUE,
  available    INTEGER NOT NULL DEFAULT 1,  -- 1 = available, 0 = taken
  similar_names TEXT NOT NULL DEFAULT '[]', -- JSON array of suggestions
  state        TEXT,
  checked_at   DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_name_checks_name ON name_checks(name);
CREATE INDEX IF NOT EXISTS idx_name_checks_checked_at ON name_checks(checked_at);

-- User sessions (supplementary to KV)
CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,            -- UUID session ID
  business_name TEXT,
  entity_type  TEXT,
  formation_state TEXT,
  steps_completed INTEGER NOT NULL DEFAULT 0,
  total_steps  INTEGER NOT NULL DEFAULT 23,
  created_at   DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at   DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at);

-- Document generation log
CREATE TABLE IF NOT EXISTS generated_docs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   TEXT NOT NULL,
  doc_type     TEXT NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_docs_session ON generated_docs(session_id);

-- Domain check cache (to reduce DNS queries)
CREATE TABLE IF NOT EXISTS domain_checks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  base_domain  TEXT NOT NULL,
  tld          TEXT NOT NULL,
  available    INTEGER,                     -- NULL = unknown, 1 = available, 0 = taken
  checked_at   DATETIME NOT NULL DEFAULT (datetime('now')),
  UNIQUE(base_domain, tld)
);

CREATE INDEX IF NOT EXISTS idx_domain_base ON domain_checks(base_domain);
