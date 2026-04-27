-- ih-finops D1 schema

CREATE TABLE IF NOT EXISTS vendors (
  id               TEXT PRIMARY KEY,
  org_id           TEXT NOT NULL,
  name             TEXT NOT NULL,
  email            TEXT,
  phone            TEXT,
  payment_method   TEXT NOT NULL DEFAULT 'ach' CHECK(payment_method IN ('ach','check','wire')),
  gl_code          TEXT,
  bank_details_enc TEXT,
  active           INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bills (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL,
  vendor_id     TEXT NOT NULL REFERENCES vendors(id),
  amount        REAL NOT NULL,
  due_date      TEXT NOT NULL,
  description   TEXT NOT NULL,
  gl_code       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending_approval'
                  CHECK(status IN ('pending_approval','approved','rejected','pending_payment','paid','escalated')),
  created_by    TEXT NOT NULL,
  approved_by   TEXT,
  approved_at   TEXT,
  rejected_by   TEXT,
  rejected_at   TEXT,
  reject_reason TEXT,
  escalated_at  TEXT,
  paid_at       TEXT,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bill_approvals (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL,
  bill_id      TEXT NOT NULL REFERENCES bills(id),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  decided_by   TEXT,
  decided_at   TEXT,
  notified_at  TEXT,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS approval_rules (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  min_amount  REAL,
  max_amount  REAL,
  priority    INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reimbursements (
  id               TEXT PRIMARY KEY,
  org_id           TEXT NOT NULL,
  submitted_by     TEXT NOT NULL,
  amount           REAL NOT NULL,
  category         TEXT NOT NULL,
  description      TEXT NOT NULL,
  receipt_doc_id   TEXT,
  gl_code          TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','paid')),
  approved_by      TEXT,
  approved_at      TEXT,
  ocr_amount       REAL,
  ocr_date         TEXT,
  ocr_vendor       TEXT,
  ocr_processed    INTEGER NOT NULL DEFAULT 0,
  ocr_processed_at TEXT,
  created_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS spend_policies (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL,
  created_by   TEXT NOT NULL,
  category     TEXT NOT NULL,
  limit_amount REAL NOT NULL,
  period       TEXT NOT NULL CHECK(period IN ('daily','monthly','yearly')),
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL,
  UNIQUE(org_id, category)
);

CREATE TABLE IF NOT EXISTS ar_invoices (
  id                 TEXT PRIMARY KEY,
  org_id             TEXT NOT NULL,
  created_by         TEXT NOT NULL,
  invoice_number     TEXT NOT NULL UNIQUE,
  customer_name      TEXT NOT NULL,
  customer_email     TEXT NOT NULL,
  amount             REAL NOT NULL,
  due_date           TEXT NOT NULL,
  line_items         TEXT NOT NULL DEFAULT '[]',
  recurring          INTEGER NOT NULL DEFAULT 0,
  recurring_interval TEXT,
  status             TEXT NOT NULL DEFAULT 'draft'
                       CHECK(status IN ('draft','ready','sent','paid','overdue','voided')),
  pdf_doc_id         TEXT,
  sent_at            TEXT,
  paid_at            TEXT,
  created_at         TEXT NOT NULL
);

-- Shared documents table (mirrored from vault)
CREATE TABLE IF NOT EXISTS documents (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL,
  uploaded_by  TEXT NOT NULL,
  category     TEXT NOT NULL,
  filename     TEXT NOT NULL,
  r2_key       TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes   INTEGER NOT NULL,
  year         INTEGER NOT NULL,
  tags         TEXT NOT NULL DEFAULT '[]',
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS organizations (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  plan       TEXT NOT NULL DEFAULT 'lite',
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bills_org_status     ON bills(org_id, status);
CREATE INDEX IF NOT EXISTS idx_bills_due_date       ON bills(due_date, status);
CREATE INDEX IF NOT EXISTS idx_reims_org_status     ON reimbursements(org_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_org_status  ON ar_invoices(org_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date    ON ar_invoices(due_date, status);
CREATE INDEX IF NOT EXISTS idx_vendors_org         ON vendors(org_id, active);
