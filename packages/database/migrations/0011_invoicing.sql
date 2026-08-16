-- 0011_invoicing.sql
-- Invoicing module: clients, invoices, line items, payments, sequence tracking.

-- Client / customer records
CREATE TABLE IF NOT EXISTS clients (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  address    TEXT,
  notes      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Invoice sequence counters — one row per org, incremented on each invoice creation
CREATE TABLE IF NOT EXISTS invoice_sequences (
  org_id      TEXT PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  last_number INTEGER NOT NULL DEFAULT 0
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id           TEXT    PRIMARY KEY,
  org_id       TEXT    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id    TEXT    REFERENCES clients(id) ON DELETE SET NULL,
  number       TEXT    NOT NULL,           -- INV-0001
  status       TEXT    NOT NULL DEFAULT 'draft', -- draft | sent | overdue | paid | void
  issue_date   TEXT    NOT NULL,
  due_date     TEXT,
  subtotal     REAL    NOT NULL DEFAULT 0,
  tax_rate     REAL    NOT NULL DEFAULT 0, -- percentage, e.g. 8.5
  tax_amount   REAL    NOT NULL DEFAULT 0,
  total_amount REAL    NOT NULL DEFAULT 0,
  amount_paid  REAL    NOT NULL DEFAULT 0,
  memo         TEXT,
  paid_at      TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Invoice line items
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id           TEXT    PRIMARY KEY,
  invoice_id   TEXT    NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description  TEXT    NOT NULL,
  quantity     REAL    NOT NULL DEFAULT 1,
  unit_price   REAL    NOT NULL DEFAULT 0,
  amount       REAL    NOT NULL DEFAULT 0, -- quantity * unit_price
  sort_order   INTEGER NOT NULL DEFAULT 0
);

-- Payment records against invoices (supports partial payments)
CREATE TABLE IF NOT EXISTS invoice_payments (
  id         TEXT    PRIMARY KEY,
  invoice_id TEXT    NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  org_id     TEXT    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount     REAL    NOT NULL,
  method     TEXT    NOT NULL DEFAULT 'other', -- bank_transfer | check | card | cash | other
  paid_at    TEXT    NOT NULL,
  reference  TEXT,   -- check number, transfer ID, etc.
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_org         ON clients(org_id, name);
CREATE INDEX IF NOT EXISTS idx_invoices_org        ON invoices(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_client     ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status     ON invoices(org_id, status);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_inv   ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments    ON invoice_payments(invoice_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_org_num ON invoices(org_id, number);
