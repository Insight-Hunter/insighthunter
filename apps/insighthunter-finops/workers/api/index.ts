// apps/insighthunter-finops/workers/api/index.ts
// ih-finops-api — Finance Operations API.
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

app.get("/health", (c) => c.json({ ok: true, service: "ih-finops-api" }));

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
