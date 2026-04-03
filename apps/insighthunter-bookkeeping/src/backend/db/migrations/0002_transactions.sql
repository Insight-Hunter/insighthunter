5CREATE TABLE IF NOT EXISTS transactions (
  id                  TEXT PRIMARY KEY,
  org_id              TEXT NOT NULL,
  date                TEXT NOT NULL,
  description         TEXT NOT NULL,
  amount              REAL NOT NULL,
  source              TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending_classification',
  account_id          TEXT REFERENCES accounts(id),
  confidence          REAL,
  ai_reasoning        TEXT,
  journal_entry_id    TEXT,
  qb_transaction_id   TEXT,
  bank_account_ref    TEXT,
  metadata            TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tx_org      ON transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_tx_status   ON transactions(org_id, status);
CREATE INDEX IF NOT EXISTS idx_tx_date     ON transactions(org_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_tx_qb       ON transactions(qb_transaction_id);
