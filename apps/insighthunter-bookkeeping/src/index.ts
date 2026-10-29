import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import {
  handleImportQueue,
  type ImportMessage,
} from "./queues/import-processing.js";

export interface Env {
  DB: D1Database;
  IMPORTS: R2Bucket;
  IMPORT_QUEUE: Queue<ImportMessage>;
  KV_IMPORT_STATUS: KVNamespace;
  AI?: Ai;
  AUTH_URL: string;
  ALLOWED_ORIGIN: string;
  ENVIRONMENT?: string;
}

interface Session {
  userId: string;
  tenantId: string;
  role: "owner" | "admin" | "member" | "viewer" | "bookkeeper" | "reviewer" | "cfo";
  orgName: string;
  tier: string;
}

interface AppVariables {
  session: Session;
  clientId: string;
  entityId: string;
}

type AppContext = Context<{ Bindings: Env; Variables: AppVariables }>;

interface AuthPayload {
  sub?: string;
  user_id?: string;
  tenantId?: string;
  role?: string;
  org_name?: string;
  tier?: string;
  exp?: number;
}

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
const BOOKKEEPING_ROLES = new Set(["owner", "admin", "member", "viewer"]);
const WRITER_ROLES = ["owner", "admin", "member", "bookkeeper"] as const;
const APPROVER_ROLES = ["owner", "admin", "reviewer", "cfo"] as const;
const DEFAULT_ACCOUNTS = [
  ["1000", "Cash", "asset", "current_asset"],
  ["1100", "Accounts Receivable", "asset", "current_asset"],
  ["1500", "Equipment", "asset", "fixed_asset"],
  ["2000", "Accounts Payable", "liability", "current_liability"],
  ["2100", "Credit Card Payable", "liability", "current_liability"],
  ["3000", "Owner Equity", "equity", "equity"],
  ["4000", "Sales Revenue", "income", "operating_income"],
  ["5000", "Cost of Goods Sold", "expense", "cost_of_goods_sold"],
  ["6100", "Payroll Expense", "expense", "operating_expense"],
  ["6200", "Rent Expense", "expense", "operating_expense"],
  ["6300", "Software Expense", "expense", "operating_expense"],
  ["6999", "Uncategorized Expense", "expense", "suspense"],
] as const;
const DEFAULT_CATEGORIES = [
  ["Revenue", "income", "4000"],
  ["Other Income", "income", "4000"],
  ["Cost of Goods Sold", "expense", "5000"],
  ["Payroll", "expense", "6100"],
  ["Rent", "expense", "6200"],
  ["Utilities", "expense", "6300"],
  ["Software & Subscriptions", "expense", "6300"],
  ["Marketing", "expense", "6300"],
  ["Travel", "expense", "6300"],
  ["Professional Services", "expense", "6300"],
  ["Bank Fees", "expense", "6300"],
  ["Uncategorized", "expense", "6999"],
] as const;

app.use(
  "*",
  cors({
    origin: (origin, c) => (origin === c.env.ALLOWED_ORIGIN ? origin : ""),
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 600,
  }),
);

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "insighthunter-bookkeeping",
    environment: c.env.ENVIRONMENT ?? "development",
  }),
);

app.use("/api/*", async (c, next) => {
  const token = getSessionToken(c.req.raw);
  if (!token) return c.json({ error: "unauthorized" }, 401);

  let authResponse: Response;
  try {
    authResponse = await fetch(`${c.env.AUTH_URL.replace(/\/$/, "")}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch {
    return c.json({ error: "authentication_unavailable" }, 503);
  }
  if (!authResponse.ok) return c.json({ error: "unauthorized" }, 401);

  let authBody: { valid?: boolean; payload?: AuthPayload };
  try {
    authBody = (await authResponse.json()) as { valid?: boolean; payload?: AuthPayload };
  } catch {
    return c.json({ error: "invalid_auth_response" }, 502);
  }

  const payload = authBody.payload;
  const userId = payload?.sub ?? payload?.user_id;
  const role = payload?.role;
  if (
    authBody.valid !== true ||
    !userId ||
    !payload?.tenantId ||
    !role ||
    !BOOKKEEPING_ROLES.has(role) ||
    (payload.exp !== undefined && payload.exp * 1000 <= Date.now())
  ) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const authRole = role as "owner" | "admin" | "member" | "viewer";
  const verifiedSession: Session = {
    userId,
    tenantId: payload.tenantId,
    role: authRole,
    orgName: payload.org_name?.trim() || "Business entity",
    tier: payload.tier ?? "lite",
  };
  try {
    const tenant = await ensureTenant(c.env.DB, verifiedSession);
    c.set("session", { ...verifiedSession, role: tenant.role });
    c.set("clientId", tenant.clientId);
    c.set("entityId", tenant.entityId);
  } catch (error) {
    console.error("Bookkeeping tenant initialization failed", safeErrorName(error));
    if (
      error instanceof Error &&
      ["tenant_not_initialized", "tenant_membership_not_found"].includes(error.message)
    ) {
      return c.json({ error: "tenant_access_not_configured" }, 403);
    }
    return c.json({ error: "tenant_initialization_failed" }, 500);
  }

  await next();
});

app.get("/api/categories", async (c) => {
  await seedAccounts(c.env.DB, c.get("clientId"), c.get("entityId"));
  const rows = await c.env.DB.prepare(
    `SELECT id, name, kind, account_id, is_system FROM bookkeeping_categories
     WHERE client_id = ?1 AND entity_id = ?2 ORDER BY kind, name`,
  )
    .bind(c.get("clientId"), c.get("entityId"))
    .all();
  return c.json({ categories: rows.results ?? [] });
});

app.post("/api/categories", async (c) => {
  const denied = requireRole(c.get("session"), WRITER_ROLES);
  if (denied) return denied;
  const body = await readJson(c);
  if (body instanceof Response) return body;
  const name = asText(body.name, 100);
  const kind = asText(body.kind, 20);
  const accountId = asText(body.accountId, 80);
  if (!name || !kind || !["income", "expense", "transfer"].includes(kind)) {
    return c.json({ error: "invalid_category" }, 400);
  }
  if (
    accountId &&
    !(await ownsAccount(c.env.DB, c.get("clientId"), c.get("entityId"), accountId))
  ) {
    return c.json({ error: "account_not_found" }, 404);
  }
  const id = crypto.randomUUID();
  try {
    await c.env.DB.prepare(
      `INSERT INTO bookkeeping_categories (id, client_id, entity_id, name, kind, account_id)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
      .bind(id, c.get("clientId"), c.get("entityId"), name, kind, accountId)
      .run();
  } catch (error) {
    if (isUniqueConstraint(error)) return c.json({ error: "category_name_exists" }, 409);
    throw error;
  }
  await writeAudit(c.env.DB, c.get("clientId"), c.get("session"), "category.created", "category", id);
  return c.json({ id, name, kind, accountId }, 201);
});

app.get("/api/setup", async (c) => {
  const session = c.get("session");
  const entityId = c.get("entityId");
  await seedAccounts(c.env.DB, c.get("clientId"), entityId);
  await writeAudit(c.env.DB, c.get("clientId"), session, "workspace.initialized", "entity", entityId);
  return c.json({ entityId, organizationId: session.tenantId, ready: true });
});

app.get("/api/overview", async (c) => {
  const clientId = c.get("clientId");
  const entityId = c.get("entityId");
  const [cash, uncategorized, openReconciliations, openTasks, openExceptions, revenue, expenses] =
    await Promise.all([
      c.env.DB.prepare(
        `SELECT COALESCE(SUM(l.debit_minor - l.credit_minor), 0) AS amount
         FROM bookkeeping_journal_lines l
         JOIN bookkeeping_journal_entries j ON j.id = l.journal_entry_id
         JOIN bookkeeping_accounts a ON a.id = l.account_id
         WHERE l.client_id = ?1 AND l.entity_id = ?2 AND j.status = 'posted'
           AND a.account_type = 'asset' AND a.code LIKE '10%'`,
      )
        .bind(clientId, entityId)
        .first<{ amount: number }>(),
      c.env.DB.prepare(
        `SELECT COUNT(*) AS count FROM bookkeeping_transactions
         WHERE client_id = ?1 AND entity_id = ?2 AND status = 'pending' AND category_id IS NULL`,
      )
        .bind(clientId, entityId)
        .first<{ count: number }>(),
      c.env.DB.prepare(
        `SELECT COUNT(*) AS count FROM bookkeeping_reconciliation_sessions
         WHERE client_id = ?1 AND entity_id = ?2 AND status IN ('open', 'in_progress', 'exception')`,
      )
        .bind(clientId, entityId)
        .first<{ count: number }>(),
      c.env.DB.prepare(
        `SELECT COUNT(*) AS count FROM bookkeeping_close_tasks
         WHERE client_id = ?1 AND status IN ('pending', 'in_progress', 'blocked')`,
      )
        .bind(clientId)
        .first<{ count: number }>(),
      c.env.DB.prepare(
        `SELECT COUNT(*) AS count FROM bookkeeping_exceptions
         WHERE client_id = ?1 AND status IN ('open', 'in_review')`,
      )
        .bind(clientId)
        .first<{ count: number }>(),
      sumPostedAccountType(c.env.DB, clientId, entityId, "income"),
      sumPostedAccountType(c.env.DB, clientId, entityId, "expense"),
    ]);

  const sync = await c.env.DB.prepare(
    `SELECT status, last_sync_at FROM bookkeeping_bank_connections
     WHERE client_id = ?1 ORDER BY updated_at DESC LIMIT 1`,
  )
    .bind(clientId)
    .first<{ status: string; last_sync_at: string | null }>();

  return c.json({
    cashMinor: cash?.amount ?? 0,
    bankSync: sync ?? { status: "not_connected", last_sync_at: null },
    uncategorizedCount: uncategorized?.count ?? 0,
    openReconciliationCount: openReconciliations?.count ?? 0,
    openTaskCount: openTasks?.count ?? 0,
    openExceptionCount: openExceptions?.count ?? 0,
    currentMonthIncomeMinor: revenue,
    currentMonthExpenseMinor: expenses,
  });
});

app.get("/api/accounts", async (c) => {
  await seedAccounts(c.env.DB, c.get("clientId"), c.get("entityId"));
  const rows = await c.env.DB.prepare(
    `SELECT id, code, name, account_type, subtype, is_active, currency
     FROM bookkeeping_accounts WHERE client_id = ?1 AND entity_id = ?2
     ORDER BY code`,
  )
    .bind(c.get("clientId"), c.get("entityId"))
    .all();
  return c.json({ accounts: rows.results ?? [] });
});

app.post("/api/accounts", async (c) => {
  const denied = requireRole(c.get("session"), WRITER_ROLES);
  if (denied) return denied;
  const body = await readJson(c);
  if (body instanceof Response) return body;
  const code = asText(body.code, 16);
  const name = asText(body.name, 120);
  const type = asText(body.accountType, 20);
  if (!code || !name || !type || !["asset", "liability", "equity", "income", "expense"].includes(type)) {
    return c.json({ error: "invalid_account" }, 400);
  }
  const id = crypto.randomUUID();
  try {
    await c.env.DB.prepare(
      `INSERT INTO bookkeeping_accounts (id, client_id, entity_id, code, name, account_type, subtype)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
      .bind(id, c.get("clientId"), c.get("entityId"), code, name, type, asText(body.subtype, 40))
      .run();
  } catch (error) {
    if (isUniqueConstraint(error)) return c.json({ error: "account_code_exists" }, 409);
    throw error;
  }
  await writeAudit(c.env.DB, c.get("clientId"), c.get("session"), "account.created", "account", id);
  return c.json({ id, code, name, accountType: type }, 201);
});

app.get("/api/transactions", async (c) => {
  const clientId = c.get("clientId");
  const entityId = c.get("entityId");
  const limit = parseBoundedInt(c.req.query("limit"), 50, 1, 200);
  const offset = parseBoundedInt(c.req.query("offset"), 0, 0, 1_000_000);
  const status = c.req.query("status");
  const q = c.req.query("q")?.trim().slice(0, 100) ?? "";
  const rows = await c.env.DB.prepare(
    `SELECT t.id, t.transaction_date, t.description, t.amount_minor, t.currency,
            t.status, t.category_id, cat.name AS category_name, t.account_id,
            a.name AS account_name, t.ai_suggested, t.source,
            EXISTS (
              SELECT 1 FROM bookkeeping_reconciliation_matches m
              WHERE m.transaction_id = t.id AND m.client_id = t.client_id AND m.status = 'matched'
            ) AS is_reconciled
     FROM bookkeeping_transactions t
     LEFT JOIN bookkeeping_categories cat ON cat.id = t.category_id AND cat.client_id = t.client_id
     LEFT JOIN bookkeeping_accounts a ON a.id = t.account_id AND a.client_id = t.client_id
     WHERE t.client_id = ?1 AND t.entity_id = ?2
       AND (?3 = '' OR t.status = ?3)
       AND (?4 = '' OR t.description LIKE '%' || ?4 || '%' OR t.normalized_description LIKE '%' || ?4 || '%')
     ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT ?5 OFFSET ?6`,
  )
    .bind(clientId, entityId, status ?? "", q, limit, offset)
    .all();
  const count = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM bookkeeping_transactions t
     WHERE t.client_id = ?1 AND t.entity_id = ?2
       AND (?3 = '' OR t.status = ?3)
       AND (?4 = '' OR t.description LIKE '%' || ?4 || '%' OR t.normalized_description LIKE '%' || ?4 || '%')`,
  )
    .bind(clientId, entityId, status ?? "", q)
    .first<{ total: number }>();
  return c.json({ transactions: rows.results ?? [], total: count?.total ?? 0, limit, offset });
});

app.post("/api/transactions", async (c) => {
  const denied = requireRole(c.get("session"), WRITER_ROLES);
  if (denied) return denied;
  const body = await readJson(c);
  if (body instanceof Response) return body;
  const description = asText(body.description, 500);
  const date = asDate(body.date);
  const amountMinor = asInteger(body.amountMinor);
  const currency = asCurrency(body.currency);
  if (!description || !date || amountMinor === null || amountMinor === 0 || !currency) {
    if (currency === null) return c.json({ error: "unsupported_currency" }, 400);
    return c.json({ error: "invalid_transaction" }, 400);
  }
  const accountId = asText(body.accountId, 80);
  if (accountId && !(await ownsAccount(c.env.DB, c.get("clientId"), c.get("entityId"), accountId))) {
    return c.json({ error: "account_not_found" }, 404);
  }
  const categoryId = asText(body.categoryId, 80);
  if (categoryId) {
    const category = await c.env.DB.prepare(
      `SELECT id FROM bookkeeping_categories WHERE id = ?1 AND client_id = ?2 AND entity_id = ?3`,
    )
      .bind(categoryId, c.get("clientId"), c.get("entityId"))
      .first();
    if (!category) return c.json({ error: "category_not_found" }, 404);
  }
  const fingerprint = await sha256(
    `${date}|${amountMinor}|${description.trim().toLowerCase()}|${accountId ?? ""}`,
  );
  const id = crypto.randomUUID();
  try {
    await c.env.DB.prepare(
      `INSERT INTO bookkeeping_transactions
        (id, client_id, entity_id, account_id, transaction_date, description, amount_minor,
         currency, source, fingerprint, status, category_id, created_by_user_id)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'manual', ?9, 'pending', ?10, ?11)`,
    )
      .bind(
        id,
        c.get("clientId"),
        c.get("entityId"),
        accountId,
        date,
        description.trim(),
        amountMinor,
        currency,
        fingerprint,
        categoryId,
        c.get("session").userId,
      )
      .run();
  } catch (error) {
    if (isUniqueConstraint(error)) return c.json({ error: "duplicate_transaction" }, 409);
    throw error;
  }
  await writeAudit(c.env.DB, c.get("clientId"), c.get("session"), "transaction.created", "transaction", id);
  return c.json({ id, status: "pending", posted: false }, 201);
});

app.patch("/api/transactions/:id", async (c) => {
  const denied = requireRole(c.get("session"), WRITER_ROLES);
  if (denied) return denied;
  const body = await readJson(c);
  if (body instanceof Response) return body;
  const id = c.req.param("id");
  const categoryId = asText(body.categoryId, 80);
  const accountId = asText(body.accountId, 80);
  const status = asText(body.status, 20);
  if (status && !["excluded", "reviewed"].includes(status)) {
    return c.json({ error: "invalid_transaction_status" }, 400);
  }
  if (
    !categoryId &&
    !accountId &&
    (!status || !["excluded", "reviewed"].includes(status))
  ) {
    return c.json({ error: "no_valid_update" }, 400);
  }
  if (categoryId) {
    const category = await c.env.DB.prepare(
      `SELECT id FROM bookkeeping_categories WHERE id = ?1 AND client_id = ?2 AND entity_id = ?3`,
    )
      .bind(categoryId, c.get("clientId"), c.get("entityId"))
      .first();
    if (!category) return c.json({ error: "category_not_found" }, 404);
  }
  if (accountId && !(await ownsAccount(c.env.DB, c.get("clientId"), c.get("entityId"), accountId))) {
    return c.json({ error: "account_not_found" }, 404);
  }
  if (status === "reviewed" && !categoryId) {
    const currentCategory = await c.env.DB.prepare(
      `SELECT category_id FROM bookkeeping_transactions
       WHERE id = ?1 AND client_id = ?2 AND entity_id = ?3`,
    )
      .bind(id, c.get("clientId"), c.get("entityId"))
      .first<{ category_id: string | null }>();
    if (!currentCategory) return c.json({ error: "transaction_not_found" }, 404);
    if (!currentCategory.category_id) return c.json({ error: "category_required_before_review" }, 409);
  }
  const result = await c.env.DB.prepare(
    `UPDATE bookkeeping_transactions
     SET category_id = COALESCE(?1, category_id),
         account_id = COALESCE(?2, account_id),
         status = COALESCE(?3, status), ai_suggested = CASE WHEN ?1 IS NULL THEN ai_suggested ELSE 0 END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?4 AND client_id = ?5 AND entity_id = ?6 AND status <> 'posted'`,
  )
    .bind(
      categoryId,
      accountId,
      status === "excluded" || status === "reviewed" ? status : null,
      id,
      c.get("clientId"),
      c.get("entityId"),
    )
    .run();
  if (!result.meta.changes) return c.json({ error: "transaction_not_found_or_locked" }, 404);
  await writeAudit(c.env.DB, c.get("clientId"), c.get("session"), "transaction.updated", "transaction", id);
  return c.json({ ok: true });
});

app.post("/api/ai-assistance/categorize", async (c) => {
  const body = await readJson(c);
  if (body instanceof Response) return body;
  const description = asText(body.description, 500);
  const amountMinor = asInteger(body.amountMinor);
  if (!description || amountMinor === null) return c.json({ error: "invalid_request" }, 400);
  if (!c.env.AI) return c.json({ error: "ai_unavailable" }, 503);
  const kind = amountMinor > 0 ? "income" : "expense";
  const categories = await c.env.DB.prepare(
    `SELECT id, name FROM bookkeeping_categories
     WHERE client_id = ?1 AND entity_id = ?2 AND kind = ?3 ORDER BY name LIMIT 100`,
  )
    .bind(c.get("clientId"), c.get("entityId"), kind)
    .all<{ id: string; name: string }>();
  if (!categories.results?.length) return c.json({ error: "categories_unavailable" }, 409);
  const output = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      {
        role: "user",
        content: `Suggest a bookkeeping category. Do not post or change records. Return only JSON with category and a short reason. Description: ${description}\nAmount in minor currency units: ${amountMinor}\nCategories: ${categories.results.map((item) => item.name).join(", ")}`,
      },
    ],
    max_tokens: 120,
  });
  const raw = typeof output === "object" && output !== null && "response" in output
    ? String(output.response)
    : "";
  const match = categories.results.find((item) => raw.toLowerCase().includes(item.name.toLowerCase()));
  const explanation = match
    ? "Suggested from the transaction description and amount. Review before applying."
    : "No confident match; choose a category manually.";
  const suggestionId = crypto.randomUUID();
  if (match) {
    await c.env.DB.prepare(
      `INSERT INTO bookkeeping_ai_suggestions
       (id, client_id, entity_id, suggestion_type, proposed_value, confidence, explanation)
       VALUES (?1, ?2, ?3, 'transaction_category', ?4, 0.5, ?5)`,
    )
      .bind(suggestionId, c.get("clientId"), c.get("entityId"), match.id, explanation)
      .run();
  }
  await writeAudit(
    c.env.DB,
    c.get("clientId"),
    c.get("session"),
    "ai.category_suggested",
    "transaction",
    null,
  );
  return c.json({
    suggestionId: match ? suggestionId : null,
    categoryId: match?.id ?? null,
    category: match?.name ?? null,
    explanation,
    requiresHumanApproval: true,
  });
});

app.get("/api/reconcile/sessions", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT r.*, a.name AS account_name FROM bookkeeping_reconciliation_sessions r
     JOIN bookkeeping_accounts a ON a.id = r.account_id AND a.client_id = r.client_id
     WHERE r.client_id = ?1 AND r.entity_id = ?2 ORDER BY r.period_end DESC LIMIT 100`,
  )
    .bind(c.get("clientId"), c.get("entityId"))
    .all();
  return c.json({ sessions: rows.results ?? [] });
});

app.post("/api/reconcile/sessions", async (c) => {
  const denied = requireRole(c.get("session"), WRITER_ROLES);
  if (denied) return denied;
  const body = await readJson(c);
  if (body instanceof Response) return body;
  const accountId = asText(body.accountId, 80);
  const periodStart = asDate(body.periodStart);
  const periodEnd = asDate(body.periodEnd);
  const beginningBalance = asInteger(body.beginningBalanceMinor);
  const endingBalance = asInteger(body.endingBalanceMinor);
  if (
    !accountId ||
    !periodStart ||
    !periodEnd ||
    periodStart > periodEnd ||
    beginningBalance === null ||
    endingBalance === null
  ) {
    return c.json({ error: "invalid_reconciliation" }, 400);
  }
  if (!(await ownsAccount(c.env.DB, c.get("clientId"), c.get("entityId"), accountId))) {
    return c.json({ error: "account_not_found" }, 404);
  }
  const id = crypto.randomUUID();
  try {
    await c.env.DB.prepare(
      `INSERT INTO bookkeeping_reconciliation_sessions
        (id, client_id, entity_id, account_id, period_start, period_end,
         beginning_balance_minor, ending_balance_minor, prepared_by_user_id)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
    )
      .bind(
        id,
        c.get("clientId"),
        c.get("entityId"),
        accountId,
        periodStart,
        periodEnd,
        beginningBalance,
        endingBalance,
        c.get("session").userId,
      )
      .run();
  } catch (error) {
    if (isUniqueConstraint(error)) return c.json({ error: "reconciliation_exists" }, 409);
    throw error;
  }
  await writeAudit(c.env.DB, c.get("clientId"), c.get("session"), "reconciliation.opened", "reconciliation", id);
  return c.json({ id, status: "open" }, 201);
});

app.post("/api/reconcile/sessions/:id/matches", async (c) => {
  const denied = requireRole(c.get("session"), WRITER_ROLES);
  if (denied) return denied;
  const body = await readJson(c);
  if (body instanceof Response) return body;
  const transactionId = asText(body.transactionId, 80);
  if (!transactionId) return c.json({ error: "transaction_id_required" }, 400);
  const transaction = await c.env.DB.prepare(
    `SELECT id, account_id, transaction_date, amount_minor, status
     FROM bookkeeping_transactions
     WHERE id = ?1 AND client_id = ?2 AND entity_id = ?3`,
  )
    .bind(transactionId, c.get("clientId"), c.get("entityId"))
    .first<{
      id: string;
      account_id: string | null;
      transaction_date: string;
      amount_minor: number;
      status: string;
    }>();
  const session = await c.env.DB.prepare(
    `SELECT id, status, account_id, period_start, period_end,
            beginning_balance_minor, ending_balance_minor
     FROM bookkeeping_reconciliation_sessions
     WHERE id = ?1 AND client_id = ?2 AND entity_id = ?3`,
  )
    .bind(c.req.param("id"), c.get("clientId"), c.get("entityId"))
    .first<{
      id: string;
      status: string;
      account_id: string;
      period_start: string;
      period_end: string;
      beginning_balance_minor: number;
      ending_balance_minor: number;
    }>();
  if (!transaction || !session) return c.json({ error: "resource_not_found" }, 404);
  if (!["open", "in_progress"].includes(session.status)) {
    return c.json({ error: "reconciliation_not_editable" }, 409);
  }
  if (
    transaction.account_id !== session.account_id ||
    transaction.transaction_date < session.period_start ||
    transaction.transaction_date > session.period_end ||
    !["pending", "reviewed", "posted"].includes(transaction.status)
  ) {
    return c.json({ error: "transaction_not_matchable_to_session" }, 409);
  }
  const existingMatch = await c.env.DB.prepare(
    `SELECT m.id FROM bookkeeping_reconciliation_matches m
     JOIN bookkeeping_reconciliation_sessions r ON r.id = m.session_id
     WHERE m.transaction_id = ?1 AND m.client_id = ?2 AND m.status = 'matched'
       AND r.status IN ('open', 'in_progress', 'matched', 'approved') LIMIT 1`,
  )
    .bind(transactionId, c.get("clientId"))
    .first();
  if (existingMatch) return c.json({ error: "transaction_already_reconciled" }, 409);
  const matchId = crypto.randomUUID();
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO bookkeeping_reconciliation_matches
          (id, client_id, session_id, transaction_id, match_type, rationale, matched_by_user_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      ).bind(
        matchId,
        c.get("clientId"),
        session.id,
        transactionId,
        body.matchType === "force_review" ? "force_review" : "manual",
        asText(body.rationale, 500),
        c.get("session").userId,
      ),
      c.env.DB.prepare(
        `UPDATE bookkeeping_transactions
         SET status = CASE WHEN status = 'posted' THEN status ELSE 'matched' END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?1 AND client_id = ?2 AND entity_id = ?3
           AND status IN ('pending', 'reviewed', 'posted')`,
      ).bind(transactionId, c.get("clientId"), c.get("entityId")),
    ]);
  } catch (error) {
    if (isUniqueConstraint(error)) return c.json({ error: "transaction_already_reconciled" }, 409);
    throw error;
  }
  const bookBalance = session.beginning_balance_minor +
    await matchedTransactionTotal(c.env.DB, c.get("clientId"), session.id);
  const difference = session.ending_balance_minor - bookBalance;
  await c.env.DB.prepare(
    `UPDATE bookkeeping_reconciliation_sessions
     SET book_balance_minor = ?1, difference_minor = ?2, status = 'in_progress',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?3 AND client_id = ?4 AND entity_id = ?5`,
  )
    .bind(bookBalance, difference, session.id, c.get("clientId"), c.get("entityId"))
    .run();
  await writeAudit(c.env.DB, c.get("clientId"), c.get("session"), "reconciliation.item_matched", "reconciliation", session.id);
  return c.json({ id: matchId, status: "matched", differenceMinor: difference }, 201);
});

app.post("/api/imports/upload", async (c) => {
  const denied = requireRole(c.get("session"), WRITER_ROLES);
  if (denied) return denied;
  const form = await c.req.formData();
  const file = form.get("file");
  if (!isUploadFile(file)) return c.json({ error: "file_required" }, 400);
  if (!file.size || file.size > 10 * 1024 * 1024) {
    return c.json({ error: "file_size_out_of_range", maxBytes: 10 * 1024 * 1024 }, 413);
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return c.json({ error: "csv_file_required" }, 415);
  }

  const importId = crypto.randomUUID();
  const clientId = c.get("clientId");
  const objectKey = `imports/${clientId}/${importId}/source.csv`;
  const bytes = await file.arrayBuffer();
  const digest = await sha256(bytes);
  await c.env.IMPORTS.put(objectKey, bytes, {
    httpMetadata: { contentType: "text/csv" },
    customMetadata: { importId, clientId, entityId: c.get("entityId") },
  });
  try {
    await c.env.DB.prepare(
      `INSERT INTO bookkeeping_imports
       (id, client_id, uploader_user_id, source_type, original_filename, r2_key, sha256, byte_size, status)
       VALUES (?1, ?2, ?3, 'csv', ?4, ?5, ?6, ?7, 'queued')`,
    )
      .bind(importId, clientId, c.get("session").userId, file.name.slice(0, 255), objectKey, digest, file.size)
      .run();
    await c.env.IMPORT_QUEUE.send({ importId, objectKey, orgId: c.get("session").tenantId });
  } catch (error) {
    await c.env.IMPORTS.delete(objectKey);
    throw error;
  }
  await c.env.KV_IMPORT_STATUS.put(
    `import:${clientId}:${importId}`,
    JSON.stringify({ status: "queued", rowCount: 0 }),
    { expirationTtl: 3600 },
  );
  await writeAudit(c.env.DB, clientId, c.get("session"), "import.uploaded", "import", importId);
  return c.json({ importId, status: "queued" }, 202);
});

app.get("/api/imports/recent", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT i.id, i.original_filename, i.status, i.imported_transaction_count,
            i.created_at, i.error_message, b.row_count, b.duplicate_count, b.warning_count
     FROM bookkeeping_imports i
     LEFT JOIN bookkeeping_import_batches b
       ON b.import_id = i.id AND b.client_id = i.client_id
     WHERE i.client_id = ?1
     ORDER BY i.created_at DESC LIMIT 20`,
  )
    .bind(c.get("clientId"))
    .all();
  return c.json({ imports: rows.results ?? [] });
});

app.get("/api/imports/:id", async (c) => {
  const record = await c.env.DB.prepare(
    `SELECT id, status, original_filename, imported_transaction_count, created_at, error_message
     FROM bookkeeping_imports WHERE id = ?1 AND client_id = ?2`,
  )
    .bind(c.req.param("id"), c.get("clientId"))
    .first();
  if (!record) return c.json({ error: "import_not_found" }, 404);
  const rows = await c.env.DB.prepare(
    `SELECT s.id, s.transaction_date, s.normalized_description, s.amount_minor,
            s.category_hint, s.status, s.review_notes
     FROM bookkeeping_staged_transactions s
     JOIN bookkeeping_import_batches b ON b.id = s.batch_id AND b.client_id = s.client_id
     WHERE b.import_id = ?1 AND s.client_id = ?2 ORDER BY s.transaction_date DESC LIMIT 500`,
  )
    .bind(c.req.param("id"), c.get("clientId"))
    .all();
  return c.json({ import: record, rows: rows.results ?? [] });
});

app.patch("/api/imports/rows/:id", async (c) => {
  const denied = requireRole(c.get("session"), WRITER_ROLES);
  if (denied) return denied;
  const body = await readJson(c);
  if (body instanceof Response) return body;
  const status = asText(body.status, 24);
  const note = asText(body.reviewNotes, 1000);
  const category = asText(body.category, 100);
  if (!status || !["ready_to_post", "ignored", "force_review"].includes(status)) {
    return c.json({ error: "invalid_staged_transaction_status" }, 400);
  }
  const result = await c.env.DB.prepare(
    `UPDATE bookkeeping_staged_transactions
     SET status = ?1, review_notes = COALESCE(?2, review_notes),
         category_hint = COALESCE(?3, category_hint), updated_at = CURRENT_TIMESTAMP
     WHERE id = ?4 AND client_id = ?5 AND status IN ('staged', 'duplicate', 'ready_to_post', 'failed')`,
  )
    .bind(status, note, category, c.req.param("id"), c.get("clientId"))
    .run();
  if (!result.meta.changes) return c.json({ error: "staged_transaction_not_found_or_final" }, 404);
  await writeAudit(
    c.env.DB,
    c.get("clientId"),
    c.get("session"),
    "import.row_reviewed",
    "staged_transaction",
    c.req.param("id"),
    { status },
  );
  return c.json({ id: c.req.param("id"), status });
});

app.post("/api/imports/:id/commit", async (c) => {
  const denied = requireRole(c.get("session"), WRITER_ROLES);
  if (denied) return denied;
  const importId = c.req.param("id");
  const clientId = c.get("clientId");
  const entityId = c.get("entityId");
  const batch = await c.env.DB.prepare(
    `SELECT b.id FROM bookkeeping_import_batches b
     JOIN bookkeeping_imports i ON i.id = b.import_id AND i.client_id = b.client_id
     WHERE b.import_id = ?1 AND b.client_id = ?2 AND b.status IN ('staged', 'mapped', 'review_required')
     LIMIT 1`,
  )
    .bind(importId, clientId)
    .first<{ id: string }>();
  if (!batch) return c.json({ error: "reviewable_import_not_found" }, 404);
  const rows = await c.env.DB.prepare(
    `SELECT s.id, s.transaction_date, s.normalized_description, s.amount_minor, s.currency,
            s.hash_fingerprint, s.category_hint, c.id AS category_id
     FROM bookkeeping_staged_transactions s
     LEFT JOIN bookkeeping_categories c
       ON c.client_id = s.client_id AND c.entity_id = ?3 AND lower(c.name) = lower(s.category_hint)
     WHERE s.batch_id = ?1 AND s.client_id = ?2 AND s.status = 'ready_to_post'`,
  )
    .bind(batch.id, clientId, entityId)
    .all<{
      id: string;
      transaction_date: string;
      normalized_description: string | null;
      amount_minor: number;
      currency: string;
      hash_fingerprint: string;
      category_hint: string | null;
      category_id: string | null;
    }>();
  if (!rows.results?.length) return c.json({ error: "no_approved_rows" }, 409);

  const statements: D1PreparedStatement[] = [];
  for (const row of rows.results) {
    const transactionId = crypto.randomUUID();
    statements.push(
      c.env.DB.prepare(
        `INSERT OR IGNORE INTO bookkeeping_transactions
         (id, client_id, entity_id, transaction_date, description, normalized_description,
          amount_minor, currency, source, import_id, fingerprint, category_id, status, created_by_user_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'csv', ?9, ?10, ?11, 'pending', ?12)`,
      ).bind(
        transactionId,
        clientId,
        entityId,
        row.transaction_date,
        row.normalized_description ?? "Imported transaction",
        row.normalized_description,
        row.amount_minor,
        row.currency.toUpperCase(),
        importId,
        row.hash_fingerprint,
        row.category_id,
        c.get("session").userId,
      ),
      c.env.DB.prepare(
        `UPDATE bookkeeping_staged_transactions SET status = 'posted', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?1 AND client_id = ?2 AND status = 'ready_to_post'`,
      ).bind(row.id, clientId),
    );
  }
  await c.env.DB.batch(statements);
  await c.env.DB.prepare(
    `UPDATE bookkeeping_import_batches SET status = 'posted', updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND client_id = ?2`,
  )
    .bind(batch.id, clientId)
    .run();
  await c.env.DB.prepare(
    `UPDATE bookkeeping_imports SET status = 'completed', imported_transaction_count = ?1,
     updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND client_id = ?3`,
  )
    .bind(rows.results.length, importId, clientId)
    .run();
  await writeAudit(c.env.DB, clientId, c.get("session"), "import.committed_for_review", "import", importId, {
    transactionCount: rows.results.length,
  });
  return c.json({ status: "completed", transactionsCreated: rows.results.length, ledgerPosted: false });
});

app.get("/api/invoices", (c) => listDocumentsOrRecords(c, "invoice"));
app.post("/api/invoices", async (c) => createReceivable(c));
app.patch("/api/invoices/:id", async (c) => updateInvoiceStatus(c));
app.get("/api/bills", (c) => listDocumentsOrRecords(c, "bill"));
app.post("/api/bills", async (c) => createPayable(c));
app.patch("/api/bills/:id", async (c) => updateBillStatus(c));

app.get("/api/documents", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT id, document_category, title, original_filename, mime_type, byte_size,
            visibility, created_at FROM bookkeeping_documents
     WHERE client_id = ?1 ORDER BY created_at DESC LIMIT 200`,
  )
    .bind(c.get("clientId"))
    .all();
  return c.json({ documents: rows.results ?? [] });
});

app.post("/api/documents", async (c) => {
  const denied = requireRole(c.get("session"), WRITER_ROLES);
  if (denied) return denied;
  const form = await c.req.formData();
  const file = form.get("file");
  if (!isUploadFile(file)) return c.json({ error: "file_required" }, 400);
  if (!file.size || file.size > 10 * 1024 * 1024) {
    return c.json({ error: "file_size_out_of_range", maxBytes: 10 * 1024 * 1024 }, 413);
  }
  if (!["application/pdf", "image/jpeg", "image/png", "text/csv"].includes(file.type)) {
    return c.json({ error: "unsupported_file_type" }, 415);
  }
  const documentId = crypto.randomUUID();
  const key = `private/${c.get("clientId")}/${c.get("entityId")}/${documentId}`;
  const bytes = await file.arrayBuffer();
  const digest = await sha256(bytes);
  const category = asText(form.get("category"), 40);
  const allowedCategories = new Set(["bank_statement", "receipt", "invoice", "tax_document", "other"]);
  if (!category || !allowedCategories.has(category)) return c.json({ error: "invalid_category" }, 400);

  await c.env.IMPORTS.put(key, bytes, {
    httpMetadata: { contentType: file.type },
    customMetadata: { clientId: c.get("clientId"), entityId: c.get("entityId"), documentId },
  });
  try {
    await c.env.DB.prepare(
      `INSERT INTO bookkeeping_documents
        (id, client_id, uploader_user_id, document_category, title, original_filename,
         mime_type, r2_key, sha256, byte_size, visibility)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'internal')`,
    )
      .bind(
        documentId,
        c.get("clientId"),
        c.get("session").userId,
        category,
        asText(form.get("title"), 160) || file.name.slice(0, 160),
        file.name.slice(0, 255),
        file.type,
        key,
        digest,
        file.size,
      )
      .run();
  } catch (error) {
    await c.env.IMPORTS.delete(key);
    throw error;
  }
  await writeAudit(c.env.DB, c.get("clientId"), c.get("session"), "document.uploaded", "document", documentId);
  return c.json({ id: documentId, status: "stored" }, 201);
});

app.get("/api/documents/:id/content", async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT id, r2_key, mime_type, original_filename FROM bookkeeping_documents
     WHERE id = ?1 AND client_id = ?2`,
  )
    .bind(c.req.param("id"), c.get("clientId"))
    .first<{ id: string; r2_key: string; mime_type: string; original_filename: string }>();
  if (!row) return c.json({ error: "document_not_found" }, 404);
  const object = await c.env.IMPORTS.get(row.r2_key);
  if (!object) return c.json({ error: "document_unavailable" }, 503);
  return new Response(object.body, {
    headers: {
      "Content-Type": row.mime_type,
      "Content-Disposition": `attachment; filename="${row.original_filename.replace(/["\\]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

app.get("/api/reports/:type", async (c) => {
  const type = c.req.param("type");
  const from = asDate(c.req.query("from")) ?? `${new Date().getUTCFullYear()}-01-01`;
  const to = asDate(c.req.query("to")) ?? new Date().toISOString().slice(0, 10);
  if (from > to) return c.json({ error: "invalid_period" }, 400);
  const clientId = c.get("clientId");
  const entityId = c.get("entityId");

  if (type === "trial-balance" || type === "general-ledger" || type === "profit-and-loss" || type === "balance-sheet") {
    const rows = await c.env.DB.prepare(
      `SELECT a.id AS account_id, a.code, a.name, a.account_type,
                COALESCE(SUM(CASE WHEN j.id IS NOT NULL THEN l.debit_minor ELSE 0 END), 0) AS debits_minor,
                COALESCE(SUM(CASE WHEN j.id IS NOT NULL THEN l.credit_minor ELSE 0 END), 0) AS credits_minor
       FROM bookkeeping_accounts a
       LEFT JOIN bookkeeping_journal_lines l
         ON l.account_id = a.id AND l.client_id = a.client_id
       LEFT JOIN bookkeeping_journal_entries j
         ON j.id = l.journal_entry_id AND j.status = 'posted'
       WHERE a.client_id = ?1 AND a.entity_id = ?2 AND a.is_active = 1
         AND (?3 = 'general-ledger' OR
           (j.entry_date >= ?4 AND j.entry_date <= ?5) OR j.id IS NULL)
         AND (?6 = 'trial-balance' OR ?6 = 'general-ledger' OR
           (?6 = 'profit-and-loss' AND a.account_type IN ('income', 'expense')) OR
           (?6 = 'balance-sheet' AND a.account_type IN ('asset', 'liability', 'equity')))
       GROUP BY a.id ORDER BY a.code`,
    )
      .bind(clientId, entityId, type, from, to, type)
      .all<{ account_id: string; code: string; name: string; account_type: string; debits_minor: number; credits_minor: number }>();
    const data = (rows.results ?? []).map((row) => ({
      ...row,
      balance_minor: row.debits_minor - row.credits_minor,
    }));
    return c.json({ report: type, period: { from, to }, data });
  }
  if (type === "ar-aging" || type === "ap-aging") {
    const table = type === "ar-aging" ? "bookkeeping_invoices" : "bookkeeping_bills";
    const records = await c.env.DB.prepare(
      `SELECT id, ${type === "ar-aging" ? "customer_name" : "vendor_name"} AS counterparty,
              due_date, total_minor, amount_paid_minor, status
       FROM ${table} WHERE client_id = ?1 AND entity_id = ?2
         AND status NOT IN ('paid', 'void') ORDER BY due_date`,
    )
      .bind(clientId, entityId)
      .all();
    return c.json({ report: type, asOf: to, data: records.results ?? [] });
  }
  return c.json({ error: "report_not_supported" }, 404);
});

app.get("/api/close/periods", async (c) => {
  const periods = await c.env.DB.prepare(
    `SELECT * FROM bookkeeping_close_periods
     WHERE client_id = ?1 ORDER BY period_year DESC, period_month DESC LIMIT 24`,
  )
    .bind(c.get("clientId"))
    .all();
  return c.json({ periods: periods.results ?? [] });
});

app.get("/api/close/periods/:id/tasks", async (c) => {
  const period = await c.env.DB.prepare(
    `SELECT id FROM bookkeeping_close_periods WHERE id = ?1 AND client_id = ?2`,
  )
    .bind(c.req.param("id"), c.get("clientId"))
    .first();
  if (!period) return c.json({ error: "period_not_found" }, 404);
  const tasks = await c.env.DB.prepare(
    `SELECT id, task_key, title, description, owner_role, status, due_at, completed_at
     FROM bookkeeping_close_tasks WHERE close_period_id = ?1 AND client_id = ?2 ORDER BY created_at`,
  )
    .bind(c.req.param("id"), c.get("clientId"))
    .all();
  return c.json({ tasks: tasks.results ?? [] });
});

app.post("/api/close/periods", async (c) => {
  const denied = requireRole(c.get("session"), WRITER_ROLES);
  if (denied) return denied;
  const body = await readJson(c);
  if (body instanceof Response) return body;
  const year = asInteger(body.year);
  const month = asInteger(body.month);
  if (year === null || year < 2000 || year > 2200 || month === null || month < 1 || month > 12) {
    return c.json({ error: "invalid_period" }, 400);
  }
  const id = crypto.randomUUID();
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO bookkeeping_close_periods (id, client_id, period_year, period_month)
         VALUES (?1, ?2, ?3, ?4)`,
      ).bind(id, c.get("clientId"), year, month),
      c.env.DB.prepare(
        `INSERT INTO bookkeeping_accounting_periods
          (id, client_id, entity_id, period_start, period_end)
         VALUES (?1, ?2, ?3, ?4, ?5)`,
      ).bind(crypto.randomUUID(), c.get("clientId"), c.get("entityId"), start, end),
      ...closeTaskTemplates.map((task) =>
        c.env.DB.prepare(
          `INSERT INTO bookkeeping_close_tasks
            (id, close_period_id, client_id, task_key, title, description, owner_role, due_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
        ).bind(crypto.randomUUID(), id, c.get("clientId"), task.key, task.title, task.description, task.owner, end),
      ),
    ]);
  } catch (error) {
    if (isUniqueConstraint(error)) return c.json({ error: "close_period_exists" }, 409);
    throw error;
  }
  await writeAudit(c.env.DB, c.get("clientId"), c.get("session"), "close.period_created", "close_period", id);
  return c.json({ id, year, month, status: "open", tasks: closeTaskTemplates.length }, 201);
});

app.patch("/api/close/tasks/:id", async (c) => {
  const denied = requireRole(c.get("session"), WRITER_ROLES);
  if (denied) return denied;
  const body = await readJson(c);
  if (body instanceof Response) return body;
  const status = asText(body.status, 20);
  if (!status || !["pending", "in_progress", "complete", "blocked"].includes(status)) {
    return c.json({ error: "invalid_task_status" }, 400);
  }
  const task = await c.env.DB.prepare(
    `SELECT t.id, t.close_period_id, p.books_locked FROM bookkeeping_close_tasks t
     JOIN bookkeeping_close_periods p ON p.id = t.close_period_id
     WHERE t.id = ?1 AND t.client_id = ?2`,
  )
    .bind(c.req.param("id"), c.get("clientId"))
    .first<{ id: string; close_period_id: string; books_locked: number }>();
  if (!task) return c.json({ error: "task_not_found" }, 404);
  if (task.books_locked) return c.json({ error: "period_locked" }, 409);
  const update = await c.env.DB.prepare(
    `UPDATE bookkeeping_close_tasks
     SET status = ?1, completed_at = CASE WHEN ?1 = 'complete' THEN CURRENT_TIMESTAMP ELSE NULL END,
         updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND client_id = ?3`,
  )
    .bind(status, task.id, c.get("clientId"))
    .run();
  if (!update.meta.changes) return c.json({ error: "task_not_updated" }, 409);
  await refreshCloseProgress(c.env.DB, task.close_period_id);
  await writeAudit(c.env.DB, c.get("clientId"), c.get("session"), "close.task_updated", "close_task", task.id);
  return c.json({ ok: true, status });
});

app.post("/api/close/periods/:id/lock", async (c) => {
  const denied = requireRole(c.get("session"), APPROVER_ROLES);
  if (denied) return denied;
  const period = await c.env.DB.prepare(
    `SELECT * FROM bookkeeping_close_periods WHERE id = ?1 AND client_id = ?2`,
  )
    .bind(c.req.param("id"), c.get("clientId"))
    .first<{ id: string; period_year: number; period_month: number; books_locked: number }>();
  if (!period) return c.json({ error: "period_not_found" }, 404);
  if (period.books_locked) return c.json({ error: "period_already_locked" }, 409);
  const incomplete = await c.env.DB.prepare(
    `SELECT COUNT(*) AS count FROM bookkeeping_close_tasks
     WHERE close_period_id = ?1 AND client_id = ?2 AND status <> 'complete'`,
  )
    .bind(period.id, c.get("clientId"))
    .first<{ count: number }>();
  if ((incomplete?.count ?? 0) > 0) return c.json({ error: "close_tasks_incomplete" }, 409);
  const start = `${period.period_year}-${String(period.period_month).padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(period.period_year, period.period_month, 0)).toISOString().slice(0, 10);
  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE bookkeeping_close_periods
       SET status = 'closed', books_locked = 1, closed_at = CURRENT_TIMESTAMP,
           closed_by_user_id = ?1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?2 AND client_id = ?3 AND books_locked = 0`,
    ).bind(c.get("session").userId, period.id, c.get("clientId")),
    c.env.DB.prepare(
      `UPDATE bookkeeping_accounting_periods
       SET status = 'closed', locked_at = CURRENT_TIMESTAMP, locked_by_user_id = ?1,
           updated_at = CURRENT_TIMESTAMP
       WHERE client_id = ?2 AND entity_id = ?3 AND period_start = ?4 AND period_end = ?5`,
    ).bind(c.get("session").userId, c.get("clientId"), c.get("entityId"), start, end),
  ]);
  await writeAudit(c.env.DB, c.get("clientId"), c.get("session"), "close.period_locked", "close_period", period.id);
  return c.json({ id: period.id, status: "closed", booksLocked: true });
});

app.post("/api/close/periods/:id/reopen", async (c) => {
  const denied = requireRole(c.get("session"), APPROVER_ROLES);
  if (denied) return denied;
  const body = await readJson(c);
  if (body instanceof Response) return body;
  const reason = asText(body.reason, 1000);
  if (!reason) return c.json({ error: "reopen_reason_required" }, 400);
  const period = await c.env.DB.prepare(
    `SELECT * FROM bookkeeping_close_periods WHERE id = ?1 AND client_id = ?2 AND books_locked = 1`,
  )
    .bind(c.req.param("id"), c.get("clientId"))
    .first<{ id: string; period_year: number; period_month: number }>();
  if (!period) return c.json({ error: "locked_period_not_found" }, 404);
  const start = `${period.period_year}-${String(period.period_month).padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(period.period_year, period.period_month, 0)).toISOString().slice(0, 10);
  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE bookkeeping_close_periods
       SET status = 'reopened', books_locked = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND client_id = ?2`,
    ).bind(period.id, c.get("clientId")),
    c.env.DB.prepare(
      `UPDATE bookkeeping_accounting_periods
       SET status = 'reopened', locked_at = NULL, locked_by_user_id = NULL,
           reopen_reason = ?1, updated_at = CURRENT_TIMESTAMP
       WHERE client_id = ?2 AND entity_id = ?3 AND period_start = ?4 AND period_end = ?5`,
    ).bind(reason, c.get("clientId"), c.get("entityId"), start, end),
  ]);
  await writeAudit(
    c.env.DB,
    c.get("clientId"),
    c.get("session"),
    "close.period_reopened",
    "close_period",
    period.id,
    { reason },
  );
  return c.json({ id: period.id, status: "reopened", reason });
});

app.get("/api/exceptions", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT id, exception_type, severity, title, description, financial_impact_minor,
            related_entity_type, related_entity_id, status, created_at
     FROM bookkeeping_exceptions WHERE client_id = ?1 AND entity_id = ?2
       AND (?3 = '' OR status = ?3)
     ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
              ABS(financial_impact_minor) DESC, created_at DESC LIMIT 200`,
  )
    .bind(c.get("clientId"), c.get("entityId"), c.req.query("status") ?? "")
    .all();
  return c.json({ exceptions: rows.results ?? [] });
});

app.get("/api/journal-entries", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT j.id, j.entry_date, j.memo, j.reference, j.status, j.created_at, j.posted_at,
            COUNT(l.id) AS line_count, COALESCE(SUM(l.debit_minor), 0) AS debit_minor,
            COALESCE(SUM(l.credit_minor), 0) AS credit_minor
     FROM bookkeeping_journal_entries j
     LEFT JOIN bookkeeping_journal_lines l
       ON l.journal_entry_id = j.id AND l.client_id = j.client_id AND l.entity_id = j.entity_id
     WHERE j.client_id = ?1 AND j.entity_id = ?2
     GROUP BY j.id ORDER BY j.entry_date DESC, j.created_at DESC LIMIT 200`,
  )
    .bind(c.get("clientId"), c.get("entityId"))
    .all();
  return c.json({ entries: rows.results ?? [] });
});

app.post("/api/journal-entries", async (c) => {
  const denied = requireRole(c.get("session"), WRITER_ROLES);
  if (denied) return denied;
  const body = await readJson(c);
  if (body instanceof Response) return body;
  const memo = asText(body.memo, 500);
  const entryDate = asDate(body.entryDate);
  const lines = Array.isArray(body.lines) ? body.lines : [];
  if (!memo || !entryDate || lines.length < 2 || lines.length > 100) {
    return c.json({ error: "invalid_journal_entry" }, 400);
  }
  let debits = 0;
  let credits = 0;
  for (const raw of lines) {
    if (typeof raw !== "object" || raw === null) return c.json({ error: "invalid_journal_line" }, 400);
    const line = raw as Record<string, unknown>;
    const accountId = asText(line.accountId, 80);
    const debit = asInteger(line.debitMinor) ?? 0;
    const credit = asInteger(line.creditMinor) ?? 0;
    if (
      !accountId ||
      debit < 0 ||
      credit < 0 ||
      (debit > 0) === (credit > 0) ||
      !(await ownsAccount(c.env.DB, c.get("clientId"), c.get("entityId"), accountId))
    ) {
      return c.json({ error: "invalid_journal_line" }, 400);
    }
    debits += debit;
    credits += credit;
  }
  if (!Number.isSafeInteger(debits) || debits === 0 || debits !== credits) {
    return c.json({ error: "journal_entry_unbalanced" }, 400);
  }
  const id = crypto.randomUUID();
  const stmts = [
    c.env.DB.prepare(
      `INSERT INTO bookkeeping_journal_entries
       (id, client_id, entity_id, entry_date, memo, reference, status, created_by_user_id)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'draft', ?7)`,
    ).bind(id, c.get("clientId"), c.get("entityId"), entryDate, memo, asText(body.reference, 100), c.get("session").userId),
    ...lines.map((raw) => {
      const line = raw as Record<string, unknown>;
      return c.env.DB.prepare(
        `INSERT INTO bookkeeping_journal_lines
         (id, client_id, entity_id, journal_entry_id, account_id, debit_minor, credit_minor, memo)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      ).bind(
        crypto.randomUUID(),
        c.get("clientId"),
        c.get("entityId"),
        id,
        asText(line.accountId, 80),
        asInteger(line.debitMinor) ?? 0,
        asInteger(line.creditMinor) ?? 0,
        asText(line.memo, 500),
      );
    }),
  ];
  await c.env.DB.batch(stmts);
  await writeAudit(c.env.DB, c.get("clientId"), c.get("session"), "journal_entry.drafted", "journal_entry", id);
  return c.json({ id, status: "draft", debitsMinor: debits, creditsMinor: credits }, 201);
});

app.post("/api/journal-entries/:id/post", async (c) => {
  const denied = requireRole(c.get("session"), APPROVER_ROLES);
  if (denied) return denied;
  const result = await c.env.DB.prepare(
    `UPDATE bookkeeping_journal_entries
     SET status = 'posted', posted_by_user_id = ?1, posted_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?2 AND client_id = ?3 AND entity_id = ?4 AND status IN ('draft', 'pending_review')`,
  )
    .bind(c.get("session").userId, c.req.param("id"), c.get("clientId"), c.get("entityId"))
    .run();
  if (!result.meta.changes) {
    const entry = await c.env.DB.prepare(
      `SELECT id, status FROM bookkeeping_journal_entries
       WHERE id = ?1 AND client_id = ?2 AND entity_id = ?3`,
    )
      .bind(c.req.param("id"), c.get("clientId"), c.get("entityId"))
      .first<{ id: string; status: string }>();
    if (!entry) return c.json({ error: "journal_entry_not_found" }, 404);
    return c.json({ error: entry.status === "posted" ? "already_posted" : "entry_cannot_be_posted" }, 409);
  }
  await writeAudit(
    c.env.DB,
    c.get("clientId"),
    c.get("session"),
    "journal_entry.posted",
    "journal_entry",
    c.req.param("id"),
  );
  return c.json({ id: c.req.param("id"), status: "posted" });
});

const closeTaskTemplates = [
  { key: "reconcile-cash", title: "Reconcile cash and card accounts", description: "Complete statement reconciliations and document unresolved differences.", owner: "bookkeeper" },
  { key: "review-uncategorized", title: "Review uncategorized transactions", description: "Resolve all material uncategorized activity.", owner: "bookkeeper" },
  { key: "review-flux", title: "Review unusual variances", description: "Investigate material changes against the prior period.", owner: "reviewer" },
  { key: "collect-documents", title: "Collect supporting documents", description: "Resolve missing support for review-critical items.", owner: "client" },
  { key: "final-review", title: "Certify period close", description: "Review the close work and approve period lock.", owner: "reviewer" },
] as const;

app.onError((error, c) => {
  if (error instanceof SyntaxError) return c.json({ error: "invalid_json" }, 400);
  console.error("Bookkeeping request failed", safeErrorName(error));
  return c.json({ error: "internal_error" }, 500);
});

app.notFound((c) => c.json({ error: "not_found" }, 404));

export { app };

export default {
  fetch: app.fetch,
  queue: handleImportQueue,
};

function getSessionToken(request: Request): string | null {
  const authorization = request.headers.get("Authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim() || null;
  const cookie = request.headers.get("Cookie");
  const value = cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("ih_session="))
    ?.slice("ih_session=".length);
  return value ? decodeURIComponent(value) : null;
}

async function ensureTenant(
  db: D1Database,
  session: Session,
): Promise<{ clientId: string; entityId: string; role: Session["role"] }> {
  let client = await db.prepare(
    `SELECT id, owner_user_id FROM bookkeeping_clients WHERE organization_id = ?1`,
  )
    .bind(session.tenantId)
    .first<{ id: string; owner_user_id: string }>();

  if (!client) {
    if (!["owner", "admin"].includes(session.role)) {
      throw new Error("tenant_not_initialized");
    }
    const clientId = crypto.randomUUID();
    const plan = session.tier === "pro" ? "pro" : session.tier === "standard" ? "standard" : "startup";
    await db.prepare(
      `INSERT OR IGNORE INTO bookkeeping_clients
        (id, organization_id, owner_user_id, legal_name, plan_code, subscription_status)
       VALUES (?1, ?2, ?3, ?4, ?5, 'active')`,
    )
      .bind(clientId, session.tenantId, session.userId, session.orgName, plan)
      .run();
    client = await db.prepare(
      `SELECT id, owner_user_id FROM bookkeeping_clients WHERE organization_id = ?1`,
    )
      .bind(session.tenantId)
      .first<{ id: string; owner_user_id: string }>();
    if (!client) throw new Error("tenant_initialization_failed");
  }

  let effectiveRole: Session["role"] = session.role;
  if (client.owner_user_id === session.userId) {
    effectiveRole = "owner";
  } else if (!["owner", "admin"].includes(session.role)) {
    const assignment = await db.prepare(
      `SELECT id, assignment_role FROM bookkeeping_team_assignments
       WHERE client_id = ?1 AND user_id = ?2 AND active = 1 LIMIT 1`,
    )
      .bind(client.id, session.userId)
      .first<{ id: string; assignment_role: string }>();
    if (!assignment) throw new Error("tenant_membership_not_found");
    effectiveRole =
      assignment.assignment_role === "bookkeeper" ||
      assignment.assignment_role === "reviewer" ||
      assignment.assignment_role === "cfo"
        ? assignment.assignment_role
        : "member";
  }

  let entity = await db.prepare(
    `SELECT id FROM bookkeeping_entities WHERE client_id = ?1 ORDER BY created_at LIMIT 1`,
  )
    .bind(client.id)
    .first<{ id: string }>();
  if (!entity) {
    const entityId = crypto.randomUUID();
    await db.prepare(
      `INSERT OR IGNORE INTO bookkeeping_entities (id, client_id, organization_id, legal_name)
       VALUES (?1, ?2, ?3, ?4)`,
    )
      .bind(entityId, client.id, session.tenantId, session.orgName)
      .run();
    entity = await db.prepare(
      `SELECT id FROM bookkeeping_entities WHERE client_id = ?1 ORDER BY created_at LIMIT 1`,
    )
      .bind(client.id)
      .first<{ id: string }>();
    if (!entity) throw new Error("entity_initialization_failed");
  }
  return { clientId: client.id, entityId: entity.id, role: effectiveRole };
}

async function seedAccounts(db: D1Database, clientId: string, entityId: string): Promise<void> {
  const existing = await db.prepare(
    `SELECT COUNT(*) AS count FROM bookkeeping_accounts WHERE client_id = ?1 AND entity_id = ?2`,
  )
    .bind(clientId, entityId)
    .first<{ count: number }>();
  if (!existing?.count) {
    await db.batch(
      DEFAULT_ACCOUNTS.map(([code, name, type, subtype]) =>
      db.prepare(
        `INSERT OR IGNORE INTO bookkeeping_accounts
         (id, client_id, entity_id, code, name, account_type, subtype, is_system)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1)`,
      ).bind(crypto.randomUUID(), clientId, entityId, code, name, type, subtype),
      ),
    );
  }
  await db.batch(
    DEFAULT_CATEGORIES.map(([name, kind, code]) =>
      db.prepare(
        `INSERT OR IGNORE INTO bookkeeping_categories
         (id, client_id, entity_id, name, kind, account_id, is_system)
         SELECT ?1, ?2, ?3, ?4, ?5, a.id, 1 FROM bookkeeping_accounts a
         WHERE a.client_id = ?2 AND a.entity_id = ?3 AND a.code = ?6`,
      ).bind(crypto.randomUUID(), clientId, entityId, name, kind, code),
    ),
  );
}

async function writeAudit(
  db: D1Database,
  clientId: string,
  session: Session,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await db.prepare(
    `INSERT INTO bookkeeping_audit_log
     (id, client_id, actor_user_id, action, entity_type, entity_id, metadata_json)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
  )
    .bind(
      crypto.randomUUID(),
      clientId,
      session.userId,
      action,
      entityType,
      entityId,
      JSON.stringify(metadata),
    )
    .run();
}

async function sumPostedAccountType(
  db: D1Database,
  clientId: string,
  entityId: string,
  accountType: "income" | "expense",
): Promise<number> {
  const row = await db.prepare(
    `SELECT COALESCE(SUM(CASE WHEN a.account_type = 'income'
       THEN l.credit_minor - l.debit_minor ELSE l.debit_minor - l.credit_minor END), 0) AS amount
     FROM bookkeeping_journal_lines l
     JOIN bookkeeping_journal_entries j ON j.id = l.journal_entry_id AND j.status = 'posted'
     JOIN bookkeeping_accounts a ON a.id = l.account_id
     WHERE l.client_id = ?1 AND l.entity_id = ?2 AND a.account_type = ?3
       AND j.entry_date >= date('now', 'start of month') AND j.entry_date <= date('now')`,
  )
    .bind(clientId, entityId, accountType)
    .first<{ amount: number }>();
  return row?.amount ?? 0;
}

async function matchedTransactionTotal(
  db: D1Database,
  clientId: string,
  sessionId: string,
): Promise<number> {
  const row = await db.prepare(
    `SELECT COALESCE(SUM(t.amount_minor), 0) AS amount
     FROM bookkeeping_reconciliation_matches m
     JOIN bookkeeping_transactions t ON t.id = m.transaction_id AND t.client_id = m.client_id
     WHERE m.client_id = ?1 AND m.session_id = ?2 AND m.status = 'matched'`,
  )
    .bind(clientId, sessionId)
    .first<{ amount: number }>();
  return row?.amount ?? 0;
}

async function ownsAccount(
  db: D1Database,
  clientId: string,
  entityId: string,
  accountId: string,
): Promise<boolean> {
  const row = await db.prepare(
    `SELECT id FROM bookkeeping_accounts WHERE id = ?1 AND client_id = ?2 AND entity_id = ?3`,
  )
    .bind(accountId, clientId, entityId)
    .first();
  return row !== null;
}

function isUploadFile(value: string | File | null): value is File {
  return (
    value !== null &&
    typeof value !== "string" &&
    typeof value.arrayBuffer === "function" &&
    typeof value.name === "string"
  );
}

async function readJson(c: { req: { json: () => Promise<unknown> }; json: (body: unknown, status?: number) => Response }): Promise<Record<string, unknown> | Response> {
  let value: unknown;
  try {
    value = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return c.json({ error: "invalid_request_body" }, 400);
  }
  return value as Record<string, unknown>;
}

function requireRole(session: Session, roles: readonly string[]): Response | null {
  return roles.includes(session.role)
    ? null
    : Response.json({ error: "forbidden" }, { status: 403 });
}

function asText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length > 0 && result.length <= maxLength ? result : null;
}

function asInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function asDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : value;
}

function asCurrency(value: unknown): "USD" | null {
  if (value === undefined || value === null || value === "") return "USD";
  return typeof value === "string" && value.trim().toUpperCase() === "USD" ? "USD" : null;
}

function parseBoundedInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

async function sha256(value: string | ArrayBuffer): Promise<string> {
  const input = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isUniqueConstraint(error: unknown): boolean {
  return error instanceof Error && /unique constraint/i.test(error.message);
}

function safeErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

async function refreshCloseProgress(db: D1Database, periodId: string): Promise<void> {
  await db.prepare(
    `UPDATE bookkeeping_close_periods SET checklist_percent = COALESCE((
       SELECT CAST(
         (SELECT COUNT(*) FROM bookkeeping_close_tasks
          WHERE close_period_id = ?1 AND status = 'complete') * 100.0 /
         NULLIF((SELECT COUNT(*) FROM bookkeeping_close_tasks WHERE close_period_id = ?1), 0)
         AS INTEGER
       )
     ), 0), updated_at = CURRENT_TIMESTAMP WHERE id = ?1`,
  )
    .bind(periodId)
    .run();
}

async function listDocumentsOrRecords(c: AppContext, kind: "invoice" | "bill"): Promise<Response> {
  const table = kind === "invoice" ? "bookkeeping_invoices" : "bookkeeping_bills";
  const rows = await c.env.DB.prepare(
    `SELECT * FROM ${table} WHERE client_id = ?1 AND entity_id = ?2 ORDER BY due_date DESC LIMIT 200`,
  )
    .bind(c.get("clientId"), c.get("entityId"))
    .all();
  return c.json({ [kind === "invoice" ? "invoices" : "bills"]: rows.results ?? [] });
}

async function createReceivable(c: AppContext): Promise<Response> {
  const denied = requireRole(c.get("session"), WRITER_ROLES);
  if (denied) return denied;
  const body = await readJson(c);
  if (body instanceof Response) return body;
  const customer = asText(body.customerName, 160);
  const number = asText(body.invoiceNumber, 80);
  const issueDate = asDate(body.issueDate);
  const dueDate = asDate(body.dueDate);
  const total = asInteger(body.totalMinor);
  if (!customer || !number || !issueDate || !dueDate || dueDate < issueDate || total === null || total < 0) {
    return c.json({ error: "invalid_invoice" }, 400);
  }
  const id = crypto.randomUUID();
  try {
    await c.env.DB.prepare(
      `INSERT INTO bookkeeping_invoices
       (id, client_id, entity_id, customer_name, customer_email, invoice_number, issue_date,
        due_date, subtotal_minor, tax_minor, total_minor, notes, created_by_user_id)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
    )
      .bind(id, c.get("clientId"), c.get("entityId"), customer, asText(body.customerEmail, 254),
        number, issueDate, dueDate, asInteger(body.subtotalMinor) ?? total, asInteger(body.taxMinor) ?? 0,
        total, asText(body.notes, 2000), c.get("session").userId)
      .run();
  } catch (error) {
    if (isUniqueConstraint(error)) return c.json({ error: "invoice_number_exists" }, 409);
    throw error;
  }
  await writeAudit(c.env.DB, c.get("clientId"), c.get("session"), "invoice.created", "invoice", id);
  return c.json({ id, status: "draft" }, 201);
}

async function createPayable(c: AppContext): Promise<Response> {
  const denied = requireRole(c.get("session"), WRITER_ROLES);
  if (denied) return denied;
  const body = await readJson(c);
  if (body instanceof Response) return body;
  const vendor = asText(body.vendorName, 160);
  const issueDate = asDate(body.issueDate);
  const dueDate = asDate(body.dueDate);
  const total = asInteger(body.totalMinor);
  if (!vendor || !issueDate || !dueDate || dueDate < issueDate || total === null || total < 0) {
    return c.json({ error: "invalid_bill" }, 400);
  }
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO bookkeeping_bills
     (id, client_id, entity_id, vendor_name, bill_number, issue_date, due_date, total_minor, created_by_user_id)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
  )
    .bind(id, c.get("clientId"), c.get("entityId"), vendor, asText(body.billNumber, 80),
      issueDate, dueDate, total, c.get("session").userId)
    .run();
  await writeAudit(c.env.DB, c.get("clientId"), c.get("session"), "bill.created", "bill", id);
  return c.json({ id, status: "draft" }, 201);
}

async function updateInvoiceStatus(c: AppContext): Promise<Response> {
  const body = await readJson(c);
  if (body instanceof Response) return body;
  const id = asText(c.req.param("id"), 80);
  if (!id) return c.json({ error: "invoice_id_required" }, 400);
  const status = asText(body.status, 24);
  if (!status || !["sent", "viewed", "void"].includes(status)) {
    return c.json({ error: "invalid_invoice_status" }, 400);
  }
  const denied = requireRole(
    c.get("session"),
    status === "void" ? APPROVER_ROLES : WRITER_ROLES,
  );
  if (denied) return denied;
  const current = await c.env.DB.prepare(
    `SELECT status FROM bookkeeping_invoices
     WHERE id = ?1 AND client_id = ?2 AND entity_id = ?3`,
  )
    .bind(id, c.get("clientId"), c.get("entityId"))
    .first<{ status: string }>();
  if (!current) return c.json({ error: "invoice_not_found" }, 404);
  const allowedTransitions: Record<string, string[]> = {
    draft: ["sent", "void"],
    sent: ["viewed", "void"],
    viewed: ["void"],
  };
  if (!allowedTransitions[current.status]?.includes(status)) {
    return c.json({ error: "invoice_status_transition_not_allowed" }, 409);
  }
  const result = await c.env.DB.prepare(
    `UPDATE bookkeeping_invoices SET status = ?1, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?2 AND client_id = ?3 AND entity_id = ?4 AND status = ?5`,
  )
    .bind(status, id, c.get("clientId"), c.get("entityId"), current.status)
    .run();
  if (!result.meta.changes) return c.json({ error: "invoice_status_changed" }, 409);
  await writeAudit(c.env.DB, c.get("clientId"), c.get("session"), "invoice.status_changed", "invoice", id);
  return c.json({ id, status });
}

async function updateBillStatus(c: AppContext): Promise<Response> {
  const body = await readJson(c);
  if (body instanceof Response) return body;
  const id = asText(c.req.param("id"), 80);
  if (!id) return c.json({ error: "bill_id_required" }, 400);
  const status = asText(body.status, 24);
  if (!status || !["pending_approval", "approved", "void"].includes(status)) {
    return c.json({ error: "invalid_bill_status" }, 400);
  }
  const denied = requireRole(
    c.get("session"),
    status === "approved" || status === "void" ? APPROVER_ROLES : WRITER_ROLES,
  );
  if (denied) return denied;
  const current = await c.env.DB.prepare(
    `SELECT status FROM bookkeeping_bills
     WHERE id = ?1 AND client_id = ?2 AND entity_id = ?3`,
  )
    .bind(id, c.get("clientId"), c.get("entityId"))
    .first<{ status: string }>();
  if (!current) return c.json({ error: "bill_not_found" }, 404);
  const allowedTransitions: Record<string, string[]> = {
    draft: ["pending_approval", "void"],
    pending_approval: ["approved", "void"],
    approved: ["void"],
  };
  if (!allowedTransitions[current.status]?.includes(status)) {
    return c.json({ error: "bill_status_transition_not_allowed" }, 409);
  }
  const result = await c.env.DB.prepare(
    `UPDATE bookkeeping_bills
     SET status = ?1, approved_by_user_id = CASE WHEN ?1 = 'approved' THEN ?2 ELSE approved_by_user_id END,
         approved_at = CASE WHEN ?1 = 'approved' THEN CURRENT_TIMESTAMP ELSE approved_at END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?3 AND client_id = ?4 AND entity_id = ?5 AND status = ?6`,
  )
    .bind(status, c.get("session").userId, id, c.get("clientId"), c.get("entityId"), current.status)
    .run();
  if (!result.meta.changes) return c.json({ error: "bill_status_changed" }, 409);
  await writeAudit(c.env.DB, c.get("clientId"), c.get("session"), "bill.status_changed", "bill", id);
  return c.json({ id, status });
}
