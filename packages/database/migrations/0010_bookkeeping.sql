-- 0010_bookkeeping.sql
-- Bookkeeping module: import sessions, parsed rows, transactions, reconciliation items.

-- Import sessions: one per file upload
CREATE TABLE IF NOT EXISTS import_sessions (
  id          TEXT    PRIMARY KEY,
  org_id      TEXT    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     TEXT    NOT NULL,
  file_name   TEXT    NOT NULL,
  object_key  TEXT    NOT NULL, -- R2 key
  status      TEXT    NOT NULL DEFAULT 'queued', -- queued | processing | parsed | committed | error
  row_count   INTEGER NOT NULL DEFAULT 0,
  error_msg   TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Parsed rows from CSV/OFX import (pre-commit staging area)
CREATE TABLE IF NOT EXISTS import_rows (
  id                      TEXT    PRIMARY KEY,
  import_id               TEXT    NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  org_id                  TEXT    NOT NULL,
  row_index               INTEGER NOT NULL,
  source_date             TEXT,
  source_description      TEXT,
  source_amount           REAL,
  normalized_date         TEXT,
  normalized_description  TEXT,
  normalized_amount       REAL,
  category                TEXT    DEFAULT 'Uncategorized',
  confidence              REAL    NOT NULL DEFAULT 0,
  review_status           TEXT    NOT NULL DEFAULT 'pending', -- pending | committed | skipped
  created_at              TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Committed transactions (post-import, post-review)
CREATE TABLE IF NOT EXISTS transactions (
  id          TEXT    PRIMARY KEY,
  org_id      TEXT    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  import_id   TEXT    REFERENCES import_sessions(id) ON DELETE SET NULL,
  date        TEXT    NOT NULL,
  description TEXT    NOT NULL,
  amount      REAL    NOT NULL, -- positive = inflow, negative = outflow
  category    TEXT    NOT NULL DEFAULT 'Uncategorized',
  status      TEXT    NOT NULL DEFAULT 'posted', -- posted | pending | void
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Reconciliation items: open items pending match to journal lines
CREATE TABLE IF NOT EXISTS reconciliation_items (
  id              TEXT    PRIMARY KEY,
  org_id          TEXT    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  txn_id          TEXT    REFERENCES transactions(id) ON DELETE SET NULL,
  journal_line_id TEXT    REFERENCES journal_lines(id) ON DELETE SET NULL,
  txn_date        TEXT    NOT NULL,
  description     TEXT    NOT NULL,
  amount          REAL    NOT NULL,
  account_id      TEXT    REFERENCES accounts(id) ON DELETE SET NULL,
  status          TEXT    NOT NULL DEFAULT 'open', -- open | matched | cleared
  matched_at      TEXT,
  cleared_at      TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Add reconciled flag to journal_lines if not present
-- (ALTER TABLE is idempotent in SQLite when column doesn't exist)
-- Note: SQLite doesn't support IF NOT EXISTS on ALTER TABLE ADD COLUMN in D1;
-- guard this in CI or apply once.
ALTER TABLE journal_lines ADD COLUMN reconciled INTEGER NOT NULL DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_import_sessions_org  ON import_sessions(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_rows_import   ON import_rows(import_id);
CREATE INDEX IF NOT EXISTS idx_import_rows_org      ON import_rows(org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org     ON transactions(org_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_cat     ON transactions(org_id, category);
CREATE INDEX IF NOT EXISTS idx_recon_org            ON reconciliation_items(org_id, status);
