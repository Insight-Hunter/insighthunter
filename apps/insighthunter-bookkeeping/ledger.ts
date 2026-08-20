/**
 * BookkeepingLedger — one Durable Object instance per user (id derived
 * deterministically from userId via idFromName, see index.ts). Each
 * instance carries its own embedded SQLite database (DO SQLite backend) —
 * no other user's requests can ever reach this instance or its storage.
 * This is the module-owned isolation pattern: rather than every module
 * sharing one generic KV vault, each module that needs structured data
 * defines its own per-user DO with its own schema.
 */
export class BookkeepingLedger {
  state: DurableObjectState;
  sql: SqlStorage;
  initialized = false;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sql = state.storage.sql;
  }

  private ensureSchema() {
    if (this.initialized) return;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        kind TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        date INTEGER NOT NULL,
        amount_cents INTEGER NOT NULL,
        description TEXT NOT NULL,
        category_id TEXT,
        ai_suggested INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id);
    `);
    this.seedDefaultCategories();
    this.initialized = true;
  }

  private seedDefaultCategories() {
    const existing = this.sql.exec("SELECT COUNT(*) as n FROM categories").one() as { n: number };
    if (existing.n > 0) return;

    const defaults: { name: string; kind: "income" | "expense" }[] = [
      { name: "Revenue", kind: "income" },
      { name: "Other Income", kind: "income" },
      { name: "Cost of Goods Sold", kind: "expense" },
      { name: "Payroll", kind: "expense" },
      { name: "Rent", kind: "expense" },
      { name: "Utilities", kind: "expense" },
      { name: "Software & Subscriptions", kind: "expense" },
      { name: "Marketing", kind: "expense" },
      { name: "Travel", kind: "expense" },
      { name: "Meals & Entertainment", kind: "expense" },
      { name: "Professional Services", kind: "expense" },
      { name: "Insurance", kind: "expense" },
      { name: "Taxes", kind: "expense" },
      { name: "Owner Draw", kind: "expense" },
      { name: "Uncategorized", kind: "expense" },
    ];
    for (const cat of defaults) {
      this.sql.exec(
        "INSERT INTO categories (id, name, kind) VALUES (?, ?, ?)",
        crypto.randomUUID(),
        cat.name,
        cat.kind
      );
    }
  }

  async fetch(request: Request): Promise<Response> {
    this.ensureSchema();
    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean); // e.g. ["transactions", "<id>"]

    try {
      if (segments[0] === "accounts") {
        if (request.method === "GET") return this.listAccounts();
        if (request.method === "POST") return this.createAccount(await request.json());
      }

      if (segments[0] === "categories" && request.method === "GET") {
        return this.listCategories();
      }

      if (segments[0] === "transactions") {
        if (request.method === "GET") return this.listTransactions(url.searchParams);
        if (request.method === "POST") return this.createTransaction(await request.json());
        if (request.method === "PATCH" && segments[1]) {
          return this.updateTransactionCategory(segments[1], await request.json());
        }
      }

      if (segments[0] === "summary" && request.method === "GET") {
        return this.summary(url.searchParams);
      }

      return Response.json({ error: "not_found" }, { status: 404 });
    } catch (err) {
      console.error("BookkeepingLedger error:", err);
      return Response.json({ error: "internal_error" }, { status: 500 });
    }
  }

  private listAccounts(): Response {
    const rows = this.sql.exec("SELECT * FROM accounts ORDER BY created_at ASC").toArray();
    return Response.json({ accounts: rows });
  }

  private createAccount(body: { name?: string; type?: string }): Response {
    if (!body.name) return Response.json({ error: "name_required" }, { status: 400 });
    const id = crypto.randomUUID();
    const now = Date.now();
    const type = body.type ?? "other";
    this.sql.exec(
      "INSERT INTO accounts (id, name, type, created_at) VALUES (?, ?, ?, ?)",
      id,
      body.name,
      type,
      now
    );
    return Response.json({ id, name: body.name, type, created_at: now }, { status: 201 });
  }

  private listCategories(): Response {
    const rows = this.sql.exec("SELECT * FROM categories ORDER BY kind, name").toArray();
    return Response.json({ categories: rows });
  }

  private createTransaction(body: {
    accountId?: string;
    date?: number;
    amountCents?: number;
    description?: string;
    categoryId?: string | null;
    aiSuggested?: boolean;
  }): Response {
    if (!body.accountId || body.amountCents === undefined || !body.description) {
      return Response.json({ error: "missing_fields" }, { status: 400 });
    }
    const id = crypto.randomUUID();
    const now = Date.now();
    const date = body.date ?? now;
    this.sql.exec(
      `INSERT INTO transactions (id, account_id, date, amount_cents, description, category_id, ai_suggested, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      body.accountId,
      date,
      body.amountCents,
      body.description,
      body.categoryId ?? null,
      body.aiSuggested ? 1 : 0,
      now
    );
    return Response.json(
      {
        id,
        account_id: body.accountId,
        date,
        amount_cents: body.amountCents,
        description: body.description,
        category_id: body.categoryId ?? null,
        ai_suggested: body.aiSuggested ? 1 : 0,
        created_at: now,
      },
      { status: 201 }
    );
  }

  private updateTransactionCategory(id: string, body: { categoryId?: string }): Response {
    if (!body.categoryId) return Response.json({ error: "category_id_required" }, { status: 400 });
    this.sql.exec(
      "UPDATE transactions SET category_id = ?, ai_suggested = 0 WHERE id = ?",
      body.categoryId,
      id
    );
    return Response.json({ id, category_id: body.categoryId, ai_suggested: 0 });
  }

  private listTransactions(params: URLSearchParams): Response {
    const accountId = params.get("accountId");
    const limit = Math.min(parseInt(params.get("limit") ?? "50", 10), 200);

    const rows = accountId
      ? this.sql
          .exec(
            "SELECT * FROM transactions WHERE account_id = ? ORDER BY date DESC LIMIT ?",
            accountId,
            limit
          )
          .toArray()
      : this.sql.exec("SELECT * FROM transactions ORDER BY date DESC LIMIT ?", limit).toArray();

    return Response.json({ transactions: rows });
  }

  private summary(params: URLSearchParams): Response {
    // Current calendar month by default.
    const now = new Date();
    const monthStart = params.get("from")
      ? parseInt(params.get("from")!, 10)
      : new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const monthEnd = params.get("to") ? parseInt(params.get("to")!, 10) : Date.now();

    const byCategory = this.sql
      .exec(
        `SELECT c.name as category, c.kind as kind, SUM(t.amount_cents) as total_cents, COUNT(*) as count
         FROM transactions t
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.date >= ? AND t.date <= ?
         GROUP BY t.category_id
         ORDER BY total_cents ASC`,
        monthStart,
        monthEnd
      )
      .toArray();

    const totals = this.sql
      .exec(
        `SELECT
           SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END) as income_cents,
           SUM(CASE WHEN amount_cents < 0 THEN amount_cents ELSE 0 END) as expense_cents
         FROM transactions WHERE date >= ? AND date <= ?`,
        monthStart,
        monthEnd
      )
      .one() as { income_cents: number | null; expense_cents: number | null };

    return Response.json({
      periodStart: monthStart,
      periodEnd: monthEnd,
      incomeCents: totals.income_cents ?? 0,
      expenseCents: totals.expense_cents ?? 0,
      netCents: (totals.income_cents ?? 0) + (totals.expense_cents ?? 0),
      byCategory,
    });
  }
}
