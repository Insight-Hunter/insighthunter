/**
 * InsightsFeed — one Durable Object per user (id = idFromName(userId)),
 * same isolation pattern as BookkeepingLedger. Stores generated insights so
 * the dashboard can show a feed over time instead of recomputing on every
 * page load, and so a user can see what was flagged last month.
 */
export class InsightsFeed {
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
      CREATE TABLE IF NOT EXISTS insights (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        severity TEXT NOT NULL,
        category TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_insights_created ON insights(created_at);
    `);
    this.initialized = true;
  }

  async fetch(request: Request): Promise<Response> {
    this.ensureSchema();
    const url = new URL(request.url);

    try {
      if (url.pathname === "/insights" && request.method === "GET") {
        const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 100);
        const rows = this.sql
          .exec("SELECT * FROM insights ORDER BY created_at DESC LIMIT ?", limit)
          .toArray();
        return Response.json({ insights: rows });
      }

      if (url.pathname === "/insights" && request.method === "POST") {
        const body = (await request.json()) as {
          title: string;
          body: string;
          severity: string;
          category?: string | null;
        };
        const id = crypto.randomUUID();
        const now = Date.now();
        this.sql.exec(
          "INSERT INTO insights (id, created_at, title, body, severity, category) VALUES (?, ?, ?, ?, ?, ?)",
          id,
          now,
          body.title,
          body.body,
          body.severity,
          body.category ?? null
        );
        return Response.json({ id, created_at: now, ...body }, { status: 201 });
      }

      return Response.json({ error: "not_found" }, { status: 404 });
    } catch (err) {
      console.error("InsightsFeed error:", err);
      return Response.json({ error: "internal_error" }, { status: 500 });
    }
  }
}
