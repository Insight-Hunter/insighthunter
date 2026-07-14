-- insighthunter-ledger D1 schema
-- Shared by: insighthunter-ledger, insighthunter-bookkeeping, insighthunter-finops, insighthunter-report

CREATE TABLE IF NOT EXISTS accounts (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,  -- asset | liability | equity | revenue | expense
  archived        INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_accounts_org  ON accounts (organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_org_code ON accounts (organization_id, code);

CREATE TABLE IF NOT EXISTS journal_entries (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  memo            TEXT,
  posted_at       TEXT NOT NULL,
  created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_je_org_created ON journal_entries (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS journal_lines (
  id               TEXT PRIMARY KEY,
  journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id       TEXT NOT NULL REFERENCES accounts(id),
  debit            REAL NOT NULL DEFAULT 0,
  credit           REAL NOT NULL DEFAULT 0,
  memo             TEXT
);

CREATE INDEX IF NOT EXISTS idx_jl_entry   ON journal_lines (journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_jl_account ON journal_lines (account_id);
