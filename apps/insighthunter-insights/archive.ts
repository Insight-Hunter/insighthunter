/**
 * ReportArchive — one Durable Object per user (idFromName(userId)), same
 * isolation pattern as BookkeepingLedger and InsightsFeed. Stores a snapshot
 * every time a report is generated, so a user (or their accountant/lender)
 * can pull up what a report said on a given date, not just recompute live.
 */
export class ReportArchive {
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
      CREATE TABLE IF NOT EXISTS report_snapshots (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        period_start INTEGER NOT NULL,
        period_end INTEGER NOT NULL,
        generated_at INTEGER NOT NULL,
        data TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_snapshots_generated ON report_snapshots(generated_at);
    `);
    this.initialized = true;
  }

  async fetch(request: Request): Promise<Response> {
    this.ensureSchema();
    const url = new URL(request.url);

    try {
      if (url.pathname === "/snapshots" && request.method === "GET") {
        const type = url.searchParams.get("type");
        const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 100);
        const rows = type
          ? this.sql
              .exec(
                "SELECT id, type, period_start, period_end, generated_at FROM report_snapshots WHERE type = ? ORDER BY generated_at DESC LIMIT ?",
                type,
                limit
              )
              .toArray()
          : this.sql
              .exec(
                "SELECT id, type, period_start, period_end, generated_at FROM report_snapshots ORDER BY generated_at DESC LIMIT ?",
                limit
              )
              .toArray();
        return Response.json({ snapshots: rows });
      }

      if (url.pathname === "/snapshots" && request.method === "POST") {
        const body = (await request.json()) as {
          type: string;
          periodStart: number;
          periodEnd: number;
          data: unknown;
        };
        const id = crypto.randomUUID();
        const now = Date.now();
        this.sql.exec(
          "INSERT INTO report_snapshots (id, type, period_start, period_end, generated_at, data) VALUES (?, ?, ?, ?, ?, ?)",
          id,
          body.type,
          body.periodStart,
          body.periodEnd,
          now,
          JSON.stringify(body.data)
        );
        return Response.json({ id, generated_at: now }, { status: 201 });
      }

      if (url.pathname.startsWith("/snapshots/") && request.method === "GET") {
        const id = url.pathname.split("/")[2];
        const row = this.sql.exec("SELECT * FROM report_snapshots WHERE id = ?", id).one() as
          | { id: string; type: string; period_start: number; period_end: number; generated_at: number; data: string }
          | undefined;
        if (!row) return Response.json({ error: "not_found" }, { status: 404 });
        return Response.json({ ...row, data: JSON.parse(row.data) });
      }

      return Response.json({ error: "not_found" }, { status: 404 });
    } catch (err) {
      console.error("ReportArchive error:", err);
      return Response.json({ error: "internal_error" }, { status: 500 });
    }
  }
}
