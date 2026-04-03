CREATE TABLE IF NOT EXISTS reconciliation_records (
  id                TEXT    PRIMARY KEY,
  org_id            TEXT    NOT NULL,
  account_id        TEXT    NOT NULL REFERENCES accounts(id),
  statement_date    TEXT    NOT NULL,
  statement_balance INTEGER NOT NULL,
  cleared_balance   INTEGER NOT NULL DEFAULT 0,
  difference        INTEGER NOT NULL DEFAULT 0,
  status            TEXT    NOT NULL DEFAULT 'UNRECONCILED'
                      CHECK(status IN ('UNRECONCILED','MATCHED','UNMATCHED','MANUALLY_CLEARED')),
  reconciled_at     TEXT,
  reconciled_by     TEXT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, account_id, statement_date)
);

CREATE INDEX IF NOT EXISTS idx_recon_org     ON reconciliation_records(org_id);
CREATE INDEX IF NOT EXISTS idx_recon_account ON reconciliation_records(account_id);

CREATE TABLE IF NOT EXISTS reconciliation_transactions (
  reconciliation_id TEXT    NOT NULL REFERENCES reconciliation_records(id) ON DELETE CASCADE,
  transaction_id    TEXT    NOT NULL REFERENCES transactions(id),
  cleared_amount    INTEGER NOT NULL,
  PRIMARY KEY(reconciliation_id, transaction_id)
);
