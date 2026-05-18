// apps/insighthunter-finops/workers/api/index.ts
<<<<<<< HEAD
// insighthunter-finops — Finance Operations API.
// Routes: vendors, bills, bill approvals, reimbursements, spend policies, AR invoices.

import { Hono } from "https://esm.sh/hono@4";
import { cors } from "https://esm.sh/hono@4/cors";
import { validateSession } from "../../../../shared/middleware/session-validator.ts";

export interface Env {
  DB: D1Database;
  APPROVALS_WORKFLOW: Workflow;
  RECEIPT_QUEUE: Queue;
  REMINDER_QUEUE: Queue;
  PDF_QUEUE: Queue;
  NOTIFICATIONS: Queue;
  DOCS: R2Bucket;
  VAULT_ENCRYPTION_KEY: string;
  AUTH_SECRET: string;
  AUTH_ORIGIN: string;
  ENVIRONMENT: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors({
  origin: ["https://insighthunter.app", "https://finops.insighthunter.app"],
  allowHeaders: ["Authorization", "Content-Type"],
  allowMethods: ["GET","POST","PUT","DELETE","OPTIONS"],
  credentials: true,
}));

app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") return next();
  try {
    const user = await validateSession(c.req.raw, c.env);
    c.set("user" as never, user);
    return next();
  } catch {
    return c.json({ ok: false, error: "Unauthorized" }, 401);
  }
});

app.get("/health", (c) => c.json({ ok: true, service: "insighthunter-finops" }));

// ─── VENDORS ──────────────────────────────────────────────────────────────────

app.get("/vendors", async (c) => {
  const user = c.get("user" as never) as { orgId: string };
  const rows = await c.env.DB.prepare(
    "SELECT id, name, email, phone, payment_method, gl_code, active FROM vendors WHERE org_id = ? ORDER BY name"
  ).bind(user.orgId).all();
  return c.json({ ok: true, data: rows.results });
});

app.post("/vendors", async (c) => {
  const user = c.get("user" as never) as { orgId: string };
  const body = await c.req.json<{
    name: string; email?: string; phone?: string;
    paymentMethod?: "ach"|"check"|"wire"; glCode?: string;
    bankAccountNumber?: string; bankRoutingNumber?: string;
  }>();
  if (!body.name) return c.json({ ok: false, error: "name required" }, 400);

  // Encrypt bank details at rest
  let bankEnc: string | null = null;
  if (body.bankAccountNumber && body.bankRoutingNumber) {
    bankEnc = await encryptField(
      JSON.stringify({ account: body.bankAccountNumber, routing: body.bankRoutingNumber }),
      c.env.VAULT_ENCRYPTION_KEY
    );
  }

  const vendorId = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO vendors (id, org_id, name, email, phone, payment_method, gl_code, bank_details_enc, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`
  ).bind(vendorId, user.orgId, body.name, body.email ?? null, body.phone ?? null,
         body.paymentMethod ?? "ach", body.glCode ?? null, bankEnc).run();
  return c.json({ ok: true, data: { vendorId } }, 201);
});

// ─── BILLS ────────────────────────────────────────────────────────────────────

app.get("/bills", async (c) => {
  const user = c.get("user" as never) as { orgId: string };
  const status = c.req.query("status");
  let q = "SELECT b.*, v.name AS vendor_name FROM bills b LEFT JOIN vendors v ON v.id = b.vendor_id WHERE b.org_id = ?";
  const params: (string | number)[] = [user.orgId];
  if (status) { q += " AND b.status = ?"; params.push(status); }
  q += " ORDER BY b.due_date ASC";
  const rows = await c.env.DB.prepare(q).bind(...params).all();
  return c.json({ ok: true, data: rows.results });
});

app.post("/bills", async (c) => {
  const user = c.get("user" as never) as { orgId: string; userId: string };
  const body = await c.req.json<{
    vendorId: string; amount: number; dueDate: string;
    description: string; glCode?: string; requiresApproval?: boolean;
  }>();
  if (!body.vendorId || !body.amount || !body.dueDate) {
    return c.json({ ok: false, error: "vendorId, amount, dueDate required" }, 400);
  }

  const billId = crypto.randomUUID();
  const needsApproval = body.requiresApproval ?? (body.amount > 1000);
  const status = needsApproval ? "pending_approval" : "approved";

  await c.env.DB.prepare(
    `INSERT INTO bills (id, org_id, vendor_id, amount, due_date, description, gl_code, status, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(billId, user.orgId, body.vendorId, body.amount, body.dueDate,
         body.description, body.glCode ?? null, status, user.userId).run();

  // Launch approval workflow if needed
  if (needsApproval) {
    await c.env.APPROVALS_WORKFLOW.create({
      id: `approval-${billId}`,
      params: { billId, orgId: user.orgId, amount: body.amount, requestedBy: user.userId },
    });
  }

  // Schedule due-date reminder
  await c.env.REMINDER_QUEUE.send({
    type: "bill_due",
    orgId: user.orgId,
    resourceId: billId,
    dueDate: body.dueDate,
    amount: body.amount,
  });

  return c.json({ ok: true, data: { billId, status } }, 201);
});

// PUT /bills/:billId/approve — manual approval action
app.put("/bills/:billId/approve", async (c) => {
  const user = c.get("user" as never) as { orgId: string; userId: string };
  const { billId } = c.req.param();
  await c.env.DB.prepare(
    `UPDATE bills SET status = 'approved', approved_by = ?, approved_at = datetime('now')
     WHERE id = ? AND org_id = ?`
  ).bind(user.userId, billId, user.orgId).run();
  await c.env.NOTIFICATIONS.send({
    orgId: user.orgId, type: "approval_needed",
    title: "Bill approved", body: `Bill #${billId.slice(0, 8)} has been approved for payment.`,
    actionUrl: `https://finops.insighthunter.app/bills/${billId}`,
    channels: ["in_app"],
  });
  return c.json({ ok: true });
});

// PUT /bills/:billId/reject
app.put("/bills/:billId/reject", async (c) => {
  const user = c.get("user" as never) as { orgId: string; userId: string };
  const { billId } = c.req.param();
  const body = await c.req.json<{ reason: string }>();
  await c.env.DB.prepare(
    `UPDATE bills SET status = 'rejected', rejected_by = ?, rejected_at = datetime('now'), reject_reason = ?
     WHERE id = ? AND org_id = ?`
  ).bind(user.userId, body.reason ?? "No reason given", billId, user.orgId).run();
  return c.json({ ok: true });
});

// ─── REIMBURSEMENTS ───────────────────────────────────────────────────────────

app.get("/reimbursements", async (c) => {
  const user = c.get("user" as never) as { orgId: string };
  const rows = await c.env.DB.prepare(
    "SELECT * FROM reimbursements WHERE org_id = ? ORDER BY created_at DESC"
  ).bind(user.orgId).all();
  return c.json({ ok: true, data: rows.results });
});

app.post("/reimbursements", async (c) => {
  const user = c.get("user" as never) as { orgId: string; userId: string };
  const body = await c.req.json<{
    amount: number; category: string; description: string;
    receiptDocId?: string; glCode?: string;
  }>();
  if (!body.amount || !body.category) {
    return c.json({ ok: false, error: "amount and category required" }, 400);
  }

  // Validate against spend policy
  const policy = await c.env.DB.prepare(
    "SELECT * FROM spend_policies WHERE org_id = ? AND category = ? AND active = 1 LIMIT 1"
  ).bind(user.orgId, body.category).first<{ limit_amount: number }>();

  if (policy && body.amount > policy.limit_amount) {
    return c.json({
      ok: false,
      error: `Amount $${body.amount} exceeds policy limit of $${policy.limit_amount} for ${body.category}`,
      code: "POLICY_LIMIT_EXCEEDED",
    }, 422);
  }

  const reimId = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO reimbursements (id, org_id, submitted_by, amount, category, description, receipt_doc_id, gl_code, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`
  ).bind(reimId, user.orgId, user.userId, body.amount, body.category,
         body.description, body.receiptDocId ?? null, body.glCode ?? null).run();

  // Queue receipt OCR if doc attached
  if (body.receiptDocId) {
    await c.env.RECEIPT_QUEUE.send({ orgId: user.orgId, reimId, docId: body.receiptDocId });
  }

  return c.json({ ok: true, data: { reimId } }, 201);
});

// POST /reimbursements/bulk-approve — approve multiple at once
app.post("/reimbursements/bulk-approve", async (c) => {
  const user = c.get("user" as never) as { orgId: string; userId: string };
  const body = await c.req.json<{ reimIds: string[] }>();
  if (!body.reimIds?.length) return c.json({ ok: false, error: "reimIds required" }, 400);

  const stmts = body.reimIds.map((id) =>
    c.env.DB.prepare(
      "UPDATE reimbursements SET status = 'approved', approved_by = ?, approved_at = datetime('now') WHERE id = ? AND org_id = ?"
    ).bind(user.userId, id, user.orgId)
  );
  await c.env.DB.batch(stmts);
  return c.json({ ok: true, data: { approved: body.reimIds.length } });
});

// ─── SPEND POLICIES ───────────────────────────────────────────────────────────

app.get("/spend-policies", async (c) => {
  const user = c.get("user" as never) as { orgId: string };
  const rows = await c.env.DB.prepare(
    "SELECT * FROM spend_policies WHERE org_id = ? AND active = 1 ORDER BY category"
  ).bind(user.orgId).all();
  return c.json({ ok: true, data: rows.results });
});

app.post("/spend-policies", async (c) => {
  const user = c.get("user" as never) as { orgId: string; userId: string };
  const body = await c.req.json<{
    category: string; limitAmount: number; period: "daily"|"monthly"|"yearly";
  }>();
  if (!body.category || !body.limitAmount || !body.period) {
    return c.json({ ok: false, error: "category, limitAmount, period required" }, 400);
  }
  const policyId = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO spend_policies (id, org_id, created_by, category, limit_amount, period, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))`
  ).bind(policyId, user.orgId, user.userId, body.category, body.limitAmount, body.period).run();
  return c.json({ ok: true, data: { policyId } }, 201);
});

// ─── AR INVOICES ──────────────────────────────────────────────────────────────

app.get("/invoices", async (c) => {
  const user = c.get("user" as never) as { orgId: string };
  const status = c.req.query("status");
  let q = "SELECT * FROM ar_invoices WHERE org_id = ?";
  const params: (string | number)[] = [user.orgId];
  if (status) { q += " AND status = ?"; params.push(status); }
  q += " ORDER BY due_date ASC";
  const rows = await c.env.DB.prepare(q).bind(...params).all();
  return c.json({ ok: true, data: rows.results });
});

app.post("/invoices", async (c) => {
  const user = c.get("user" as never) as { orgId: string; userId: string };
  const body = await c.req.json<{
    customerName: string; customerEmail: string; amount: number;
    dueDate: string; lineItems: Array<{ description: string; amount: number; qty: number }>;
    recurring?: boolean; recurringInterval?: "monthly"|"quarterly"|"yearly";
  }>();
  if (!body.customerName || !body.amount || !body.dueDate) {
    return c.json({ ok: false, error: "customerName, amount, dueDate required" }, 400);
  }

  const invoiceId = crypto.randomUUID();
  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

  await c.env.DB.prepare(
    `INSERT INTO ar_invoices (id, org_id, created_by, invoice_number, customer_name, customer_email,
       amount, due_date, line_items, recurring, recurring_interval, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', datetime('now'))`
  ).bind(
    invoiceId, user.orgId, user.userId, invoiceNumber,
    body.customerName, body.customerEmail, body.amount, body.dueDate,
    JSON.stringify(body.lineItems ?? []),
    body.recurring ? 1 : 0, body.recurringInterval ?? null
  ).run();

  // Queue PDF generation
  await c.env.PDF_QUEUE.send({ orgId: user.orgId, invoiceId, invoiceNumber });

  return c.json({ ok: true, data: { invoiceId, invoiceNumber } }, 201);
});

app.put("/invoices/:invoiceId/send", async (c) => {
  const user = c.get("user" as never) as { orgId: string };
  const { invoiceId } = c.req.param();
  await c.env.DB.prepare(
    "UPDATE ar_invoices SET status = 'sent', sent_at = datetime('now') WHERE id = ? AND org_id = ?"
  ).bind(invoiceId, user.orgId).run();
  return c.json({ ok: true });
});

export default app;

// ─── Encryption Helper ────────────────────────────────────────────────────────

async function encryptField(plaintext: string, keyHex: string): Promise<string> {
  const enc = new TextEncoder();
  const keyBytes = hexToBytes(keyHex);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  const result = new Uint8Array(12 + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), 12);
  return Array.from(result).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return arr;
}
=======
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { sessionValidator } from '../../../../shared/middleware/session-validator';
import type { FinopsEnv, Session } from '../../../../shared/types';

type Variables = { session: Session };

type AccountRow = {
  id: string;
  name: string;
  accountType: string;
  status: string;
  availableBalance: number;
  currentBalance: number;
};

type AlertRow = {
  id: string;
  severity: 'success' | 'warning' | 'danger';
  title: string;
  body: string;
};

const app = new Hono<{ Bindings: FinopsEnv; Variables: Variables }>();
app.use('*', logger());

async function ensureSchema(db: D1Database) {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS finops_mercury_accounts (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        name TEXT NOT NULL,
        account_type TEXT NOT NULL,
        status TEXT NOT NULL,
        available_balance REAL NOT NULL,
        current_balance REAL NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS finops_mercury_transactions (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        posted_at TEXT NOT NULL,
        description TEXT NOT NULL,
        direction TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS finops_alerts (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
  ]);
}

async function seedDemo(db: D1Database, orgId: string) {
  const existing = await db
    .prepare(`SELECT id FROM finops_mercury_accounts WHERE org_id = ? LIMIT 1`)
    .bind(orgId)
    .first();

  if (existing) return;

  await db.batch([
    db.prepare(`
      INSERT INTO finops_mercury_accounts
      (id, org_id, name, account_type, status, available_balance, current_balance)
      VALUES
      ('acct_operating', ?, 'Operating', 'Checking', 'active', 121337.14, 127801.79),
      ('acct_tax', ?, 'Tax Reserve', 'Savings', 'active', 40112.25, 40112.25),
      ('acct_payroll', ?, 'Payroll Buffer', 'Checking', 'active', 24970.73, 24970.73)
    `).bind(orgId, orgId, orgId),
    db.prepare(`
      INSERT INTO finops_mercury_transactions
      (id, org_id, posted_at, description, direction, amount, status)
      VALUES
      ('txn_1', ?, '2026-04-28', 'Client payment - Apex Advisory', 'credit', 18500.00, 'posted'),
      ('txn_2', ?, '2026-04-27', 'AWS infrastructure', 'debit', 892.14, 'posted'),
      ('txn_3', ?, '2026-04-26', 'Contractor payout', 'debit', 4200.00, 'posted'),
      ('txn_4', ?, '2026-04-25', 'Mercury card settlement', 'debit', 1388.63, 'posted'),
      ('txn_5', ?, '2026-04-25', 'Interest credit', 'credit', 42.91, 'posted')
    `).bind(orgId, orgId, orgId, orgId, orgId),
    db.prepare(`
      INSERT INTO finops_alerts
      (id, org_id, severity, title, body)
      VALUES
      ('alert_1', ?, 'warning', '7-day outflows elevated', 'Outflows increased 18% versus the prior 7-day period.'),
      ('alert_2', ?, 'success', 'Mercury sync healthy', 'Last sync completed successfully with no rejected records.')
    `).bind(orgId, orgId)
  ]);
}

app.get('/health', async (c) => {
  await ensureSchema(c.env.DB);
  return c.json({ ok: true, service: 'insighthunter-finops' });
});

app.use('/v1/*', sessionValidator);

app.get('/v1/mercury/bootstrap', async (c) => {
  await ensureSchema(c.env.DB);
  const session = c.get('session');
  await seedDemo(c.env.DB, session.org.orgId);

  return c.json({
    ok: true,
    app: 'finops',
    pages: [
      '/finops/overview',
      '/finops/accounts',
      '/finops/transactions',
      '/finops/alerts',
      '/finops/settings'
    ],
    orgId: session.org.orgId,
    authAuthority: c.env.AUTH_BASE_URL
  });
});

app.get('/v1/mercury/overview', async (c) => {
  await ensureSchema(c.env.DB);
  const session = c.get('session');
  await seedDemo(c.env.DB, session.org.orgId);

  const accounts = await c.env.DB
    .prepare(`
      SELECT id, name, account_type as accountType, status, available_balance as availableBalance, current_balance as currentBalance
      FROM finops_mercury_accounts
      WHERE org_id = ?
      ORDER BY name ASC
    `)
    .bind(session.org.orgId)
    .all<AccountRow>();

  const txIn = await c.env.DB
    .prepare(`SELECT COALESCE(SUM(amount),0) as total FROM finops_mercury_transactions WHERE org_id = ? AND direction = 'credit'`)
    .bind(session.org.orgId)
    .first<{ total: number }>();

  const txOut = await c.env.DB
    .prepare(`SELECT COALESCE(SUM(amount),0) as total FROM finops_mercury_transactions WHERE org_id = ? AND direction = 'debit'`)
    .bind(session.org.orgId)
    .first<{ total: number }>();

  const alerts = await c.env.DB
    .prepare(`SELECT id, severity, title, body FROM finops_alerts WHERE org_id = ? ORDER BY created_at DESC`)
    .bind(session.org.orgId)
    .all<AlertRow>();

  const availableCash = (accounts.results || []).reduce((sum, row) => sum + Number(row.availableBalance || 0), 0);
  const currentCash = (accounts.results || []).reduce((sum, row) => sum + Number(row.currentBalance || 0), 0);

  return c.json({
    metrics: {
      availableCash,
      currentCash,
      last30Inflows: Number(txIn?.total || 0),
      last30Outflows: Number(txOut?.total || 0),
      accountCount: (accounts.results || []).length
    },
    accounts: accounts.results || [],
    alerts: alerts.results || [],
    sync: {
      status: 'complete',
      at: new Date().toISOString()
    }
  });
});

app.get('/v1/mercury/accounts', async (c) => {
  const session = c.get('session');
  const rows = await c.env.DB
    .prepare(`
      SELECT id, name, account_type as accountType, status, available_balance as availableBalance, current_balance as currentBalance
      FROM finops_mercury_accounts
      WHERE org_id = ?
      ORDER BY name ASC
    `)
    .bind(session.org.orgId)
    .all<AccountRow>();

  return c.json({ items: rows.results || [] });
});

app.get('/v1/mercury/transactions', async (c) => {
  const session = c.get('session');
  const rows = await c.env.DB
    .prepare(`
      SELECT id, posted_at as postedAt, description, direction, amount, status
      FROM finops_mercury_transactions
      WHERE org_id = ?
      ORDER BY posted_at DESC
    `)
    .bind(session.org.orgId)
    .all();

  return c.json({ items: rows.results || [] });
});

app.get('/v1/mercury/alerts', async (c) => {
  const session = c.get('session');
  const rows = await c.env.DB
    .prepare(`
      SELECT id, severity, title, body
      FROM finops_alerts
      WHERE org_id = ?
      ORDER BY created_at DESC
    `)
    .bind(session.org.orgId)
    .all<AlertRow>();

  return c.json({ items: rows.results || [] });
});

app.get('/v1/mercury/settings', async (c) => {
  const session = c.get('session');
  return c.json({
    workspace: 'InsightHunter FinOps',
    module: 'Mercury Treasury',
    orgId: session.org.orgId,
    phase: 'Phase I',
    authAuthority: c.env.AUTH_BASE_URL,
    deployment: 'Cloudflare Workers + D1 + KV + Analytics Engine',
    syncMode: 'manual-now scheduled-later'
  });
});

export default app;
>>>>>>> origin/main
