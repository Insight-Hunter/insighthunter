/**
 * BizFormaRecord — one Durable Object per user (idFromName(userId)), same
 * isolation pattern as the other modules. Tracks business entity records
 * and compliance deadlines the user (or this module) has entered.
 *
 * IMPORTANT SCOPE NOTE: this module does not file anything with any state
 * or federal agency. It is a tracker and reminder system. See this app's
 * README for what a real formation-filing integration would require.
 */
export class BizFormaRecord {
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
      CREATE TABLE IF NOT EXISTS entities (
        id TEXT PRIMARY KEY,
        legal_name TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        state TEXT NOT NULL,
        formation_date INTEGER,
        status TEXT NOT NULL DEFAULT 'planned',
        notes TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS compliance_items (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        title TEXT NOT NULL,
        due_date INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        recurrence TEXT NOT NULL DEFAULT 'none',
        notes TEXT,
        created_at INTEGER NOT NULL,
        completed_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_compliance_due ON compliance_items(due_date);
      CREATE INDEX IF NOT EXISTS idx_compliance_entity ON compliance_items(entity_id);
    `);
    this.initialized = true;
  }

  async fetch(request: Request): Promise<Response> {
    this.ensureSchema();
    this.markOverdueItems();

    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);

    try {
      if (segments[0] === "entities") {
        if (request.method === "GET") return this.listEntities();
        if (request.method === "POST") return this.createEntity(await request.json());
        if (request.method === "PATCH" && segments[1]) {
          return this.updateEntity(segments[1], await request.json());
        }
      }

      if (segments[0] === "compliance") {
        if (request.method === "GET") return this.listCompliance(url.searchParams);
        if (request.method === "POST") return this.createCompliance(await request.json());
        if (request.method === "PATCH" && segments[1]) {
          return this.updateCompliance(segments[1], await request.json());
        }
      }

      return Response.json({ error: "not_found" }, { status: 404 });
    } catch (err) {
      console.error("BizFormaRecord error:", err);
      return Response.json({ error: "internal_error" }, { status: 500 });
    }
  }

  private markOverdueItems() {
    this.sql.exec(
      "UPDATE compliance_items SET status = 'overdue' WHERE status = 'pending' AND due_date < ?",
      Date.now()
    );
  }

  private listEntities(): Response {
    const rows = this.sql.exec("SELECT * FROM entities ORDER BY created_at ASC").toArray();
    return Response.json({ entities: rows });
  }

  private createEntity(body: {
    legalName?: string;
    entityType?: string;
    state?: string;
    formationDate?: number | null;
    status?: string;
    notes?: string | null;
  }): Response {
    if (!body.legalName || !body.entityType || !body.state) {
      return Response.json({ error: "missing_fields" }, { status: 400 });
    }
    const id = crypto.randomUUID();
    const now = Date.now();
    this.sql.exec(
      `INSERT INTO entities (id, legal_name, entity_type, state, formation_date, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      body.legalName,
      body.entityType,
      body.state,
      body.formationDate ?? null,
      body.status ?? "planned",
      body.notes ?? null,
      now
    );
    return Response.json({ id, created_at: now, ...body }, { status: 201 });
  }

  private updateEntity(id: string, body: Record<string, unknown>): Response {
    const fields: string[] = [];
    const values: unknown[] = [];
    const map: Record<string, string> = {
      legalName: "legal_name",
      entityType: "entity_type",
      state: "state",
      formationDate: "formation_date",
      status: "status",
      notes: "notes",
    };
    for (const [key, column] of Object.entries(map)) {
      if (key in body) {
        fields.push(`${column} = ?`);
        values.push(body[key]);
      }
    }
    if (fields.length === 0) return Response.json({ error: "no_fields" }, { status: 400 });
    values.push(id);
    this.sql.exec(`UPDATE entities SET ${fields.join(", ")} WHERE id = ?`, ...values);
    return Response.json({ id, updated: true });
  }

  private listCompliance(params: URLSearchParams): Response {
    const withinDays = params.get("withinDays");
    const entityId = params.get("entityId");

    let query = "SELECT * FROM compliance_items WHERE 1=1";
    const bindings: unknown[] = [];
    if (entityId) {
      query += " AND entity_id = ?";
      bindings.push(entityId);
    }
    if (withinDays) {
      query += " AND due_date <= ? AND status != 'completed'";
      bindings.push(Date.now() + parseInt(withinDays, 10) * 24 * 60 * 60 * 1000);
    }
    query += " ORDER BY due_date ASC";

    const rows = this.sql.exec(query, ...bindings).toArray();
    return Response.json({ compliance: rows });
  }

  private createCompliance(body: {
    entityId?: string;
    title?: string;
    dueDate?: number;
    recurrence?: string;
    notes?: string | null;
  }): Response {
    if (!body.entityId || !body.title || !body.dueDate) {
      return Response.json({ error: "missing_fields" }, { status: 400 });
    }
    const id = crypto.randomUUID();
    const now = Date.now();
    this.sql.exec(
      `INSERT INTO compliance_items (id, entity_id, title, due_date, status, recurrence, notes, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
      id,
      body.entityId,
      body.title,
      body.dueDate,
      body.recurrence ?? "none",
      body.notes ?? null,
      now
    );
    return Response.json({ id, created_at: now, status: "pending", ...body }, { status: 201 });
  }

  private updateCompliance(id: string, body: { status?: string }): Response {
    if (!body.status) return Response.json({ error: "status_required" }, { status: 400 });
    const completedAt = body.status === "completed" ? Date.now() : null;
    this.sql.exec(
      "UPDATE compliance_items SET status = ?, completed_at = ? WHERE id = ?",
      body.status,
      completedAt,
      id
    );

    // If this item recurs, schedule the next occurrence automatically.
    if (body.status === "completed") {
      const item = this.sql.exec("SELECT * FROM compliance_items WHERE id = ?", id).one() as
        | { entity_id: string; title: string; due_date: number; recurrence: string }
        | undefined;
      if (item && item.recurrence !== "none") {
        const nextDue = advanceDate(item.due_date, item.recurrence);
        const nextId = crypto.randomUUID();
        this.sql.exec(
          `INSERT INTO compliance_items (id, entity_id, title, due_date, status, recurrence, notes, created_at)
           VALUES (?, ?, ?, ?, 'pending', ?, NULL, ?)`,
          nextId,
          item.entity_id,
          item.title,
          nextDue,
          item.recurrence,
          Date.now()
        );
      }
    }

    return Response.json({ id, status: body.status, completed_at: completedAt });
  }
}

function advanceDate(dueDateMs: number, recurrence: string): number {
  const d = new Date(dueDateMs);
  if (recurrence === "annual") d.setFullYear(d.getFullYear() + 1);
  else if (recurrence === "biennial") d.setFullYear(d.getFullYear() + 2);
  else if (recurrence === "quarterly") d.setMonth(d.getMonth() + 3);
  return d.getTime();
}
