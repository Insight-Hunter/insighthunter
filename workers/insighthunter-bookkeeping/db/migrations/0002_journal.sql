CREATE TABLE IF NOT EXISTS journal_entries (
  id             TEXT    PRIMARY KEY,
  org_id         TEXT    NOT NULL,
  transaction_id TEXT    REFERENCES transactions(id),
  date           TEXT    NOT NULL,
  reference      TEXT,
  memo           TEXT,
  is_balanced    INTEGER NOT NULL DEFAULT 0,
  created_by     TEXT    NOT NULL,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_journal_org         ON journal_entries(org_id);
CREATE INDEX IF NOT EXISTS idx_journal_date        ON journal_entries(org_id, date);
CREATE INDEX IF NOT EXISTS idx_journal_transaction ON journal_entries(transaction_id);

CREATE TABLE IF NOT EXISTS journal_lines (
  id         TEXT    PRIMARY KEY,
  entry_id   TEXT    NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id TEXT    NOT NULL REFERENCES accounts(id),
  debit      INTEGER NOT NULL DEFAULT 0,
  credit     INTEGER NOT NULL DEFAULT 0,
  memo       TEXT,
  line_order INTEGER NOT NULL DEFAULT 0,
  CHECK(debit  >= 0),
  CHECK(credit >= 0),
  CHECK(NOT (debit > 0 AND credit > 0))
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry   ON journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);
