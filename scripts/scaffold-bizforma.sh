#!/usr/bin/env bash
# scripts/scaffold-bizforma.sh
# ─────────────────────────────────────────────────────────────
# Writes ALL source files for apps/insighthunter-bizforma
# Run from repo root: ./scripts/scaffold-bizforma.sh
# ─────────────────────────────────────────────────────────────

set -euo pipefail

APP="apps/insighthunter-bizforma"
SRC="$APP/src"
PUB="$APP/public"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
ok() { echo -e "${GREEN}✓${NC} $*"; }
hdr() { echo -e "\n${CYAN}── $* ──${NC}"; }

write() {
  local path="$1"; shift
  mkdir -p "$(dirname "$path")"
  cat > "$path"
  ok "$path"
}

# ─────────────────────────────────────────────────────────────────────────────
hdr "middleware/auth.ts"
write "$SRC/middleware/auth.ts" << 'EOF'
// middleware/auth.ts — JWT auth middleware for BizForma
import type { Context, Next } from "hono";
import type { BizformaEnv } from "../types.js";

interface JWTPayload {
  sub: string;
  org: string;
  role: string;
  email: string;
  name?: string;
  exp: number;
}

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    orgId: string;
    role: string;
    email: string;
    name: string;
  }
}

export async function requireAuth(
  c: Context<{ Bindings: BizformaEnv }>,
  next: Next
): Promise<Response | void> {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return c.json({ error: "Unauthorized", code: "MISSING_TOKEN" }, 401);

  const payload = await verifyJWT(token, c.env.JWT_SECRET ?? "");
  if (!payload) return c.json({ error: "Unauthorized", code: "INVALID_TOKEN" }, 401);

  c.set("userId", payload.sub);
  c.set("orgId",  payload.org);
  c.set("role",   payload.role);
  c.set("email",  payload.email);
  c.set("name",   payload.name ?? payload.email);

  await next();
}

async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [h, p, s] = parts;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const sig = Uint8Array.from(
      atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)
    );
    const valid = await crypto.subtle.verify("HMAC", key, sig, enc.encode(`${h}.${p}`));
    if (!valid) return null;

    const payload = JSON.parse(atob(p)) as JWTPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}
EOF

# ─────────────────────────────────────────────────────────────────────────────
hdr "services/formation.ts"
write "$SRC/services/formation.ts" << 'EOF'
// services/formation.ts — Business formation case CRUD
import type { D1Database } from "@cloudflare/workers-types";

export interface FormationCase {
  id: string;
  org_id: string;
  user_id: string;
  entity_type: string;   // LLC | S-Corp | C-Corp | Sole Proprietorship | Partnership
  state: string;
  business_name: string;
  status: string;        // draft | in_review | filed | active | rejected
  registered_agent?: string;
  ein?: string;
  formation_date?: string;
  metadata_json?: string;
  created_at: string;
  updated_at: string;
}

export async function createCase(
  db: D1Database,
  data: Omit<FormationCase, "id" | "created_at" | "updated_at">
): Promise<FormationCase> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO bizforma_cases
      (id, org_id, user_id, entity_type, state, business_name, status,
       registered_agent, ein, formation_date, metadata_json, created_at, updated_at)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)
  `).bind(id, data.org_id, data.user_id, data.entity_type, data.state,
    data.business_name, data.status ?? "draft",
    data.registered_agent ?? null, data.ein ?? null,
    data.formation_date ?? null, data.metadata_json ?? null, now, now).run();
  return getCaseById(db, id) as Promise<FormationCase>;
}

export async function getCaseById(db: D1Database, id: string) {
  return db.prepare("SELECT * FROM bizforma_cases WHERE id = ?1").bind(id).first();
}

export async function listCasesByOrg(db: D1Database, orgId: string) {
  const result = await db.prepare(
    "SELECT * FROM bizforma_cases WHERE org_id = ?1 ORDER BY created_at DESC"
  ).bind(orgId).all();
  return result.results ?? [];
}

export async function updateCaseStatus(
  db: D1Database, id: string, status: string, meta?: Record<string, unknown>
) {
  await db.prepare(`
    UPDATE bizforma_cases
    SET status = ?1, metadata_json = COALESCE(?2, metadata_json), updated_at = datetime('now')
    WHERE id = ?3
  `).bind(status, meta ? JSON.stringify(meta) : null, id).run();
}
EOF

# ─────────────────────────────────────────────────────────────────────────────
hdr "services/compliance-calendar.ts"
write "$SRC/services/compliance-calendar.ts" << 'EOF'
// services/compliance-calendar.ts — Annual report, BOI, tax deadlines
import type { D1Database } from "@cloudflare/workers-types";

export interface ComplianceEvent {
  id: string;
  case_id: string;
  org_id: string;
  event_type: string;   // annual_report | boi_filing | tax_deadline | registered_agent_renewal
  title: string;
  due_date: string;
  status: string;       // pending | completed | overdue | waived
  notes?: string;
  created_at: string;
  updated_at: string;
}

export async function listEventsByCase(db: D1Database, caseId: string) {
  const r = await db.prepare(
    "SELECT * FROM bizforma_compliance_events WHERE case_id = ?1 ORDER BY due_date ASC"
  ).bind(caseId).all();
  return r.results ?? [];
}

export async function listUpcomingEvents(db: D1Database, orgId: string, daysAhead = 30) {
  const cutoff = new Date(Date.now() + daysAhead * 86400000).toISOString().split("T")[0];
  const r = await db.prepare(`
    SELECT * FROM bizforma_compliance_events
    WHERE org_id = ?1 AND status = 'pending' AND due_date <= ?2
    ORDER BY due_date ASC
  `).bind(orgId, cutoff).all();
  return r.results ?? [];
}

export async function flagOverdueEvents(db: D1Database) {
  const today = new Date().toISOString().split("T")[0];
  await db.prepare(`
    UPDATE bizforma_compliance_events
    SET status = 'overdue', updated_at = datetime('now')
    WHERE status = 'pending' AND due_date < ?1
  `).bind(today).run();
}

export async function markEventComplete(db: D1Database, eventId: string, notes?: string) {
  await db.prepare(`
    UPDATE bizforma_compliance_events
    SET status = 'completed', notes = COALESCE(?1, notes), updated_at = datetime('now')
    WHERE id = ?2
  `).bind(notes ?? null, eventId).run();
}

export async function createEvent(
  db: D1Database,
  data: Omit<ComplianceEvent, "id" | "created_at" | "updated_at">
) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO bizforma_compliance_events
      (id, case_id, org_id, event_type, title, due_date, status, notes, created_at, updated_at)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)
  `).bind(id, data.case_id, data.org_id, data.event_type, data.title,
    data.due_date, data.status ?? "pending", data.notes ?? null, now, now).run();
}
EOF

# ─────────────────────────────────────────────────────────────────────────────
hdr "services/document-store.ts"
write "$SRC/services/document-store.ts" << 'EOF'
// services/document-store.ts — R2 document vault operations
import type { R2Bucket } from "@cloudflare/workers-types";

export interface DocumentMeta {
  id: string;
  case_id: string;
  org_id: string;
  doc_type: string;   // articles_of_org | ein_letter | operating_agreement | boi | annual_report
  filename: string;
  r2_key: string;
  status: string;     // pending | ready | archived
  created_at: string;
}

export async function uploadDocument(
  bucket: R2Bucket,
  key: string,
  body: ArrayBuffer,
  contentType: string
) {
  await bucket.put(key, body, {
    httpMetadata: { contentType },
    customMetadata: { uploadedAt: new Date().toISOString() },
  });
}

export async function getSignedDownloadUrl(
  bucket: R2Bucket,
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  // R2 presigned URLs via Workers
  const obj = await bucket.get(key);
  if (!obj) throw new Error(`Document not found: ${key}`);
  // Return a worker-proxied download endpoint instead of direct R2 URL
  return `/api/formation/documents/${encodeURIComponent(key)}/download`;
}

export async function deleteDocument(bucket: R2Bucket, key: string) {
  await bucket.delete(key);
}

export function buildR2Key(orgId: string, caseId: string, filename: string): string {
  return `${orgId}/${caseId}/${Date.now()}-${filename}`;
}
EOF

# ─────────────────────────────────────────────────────────────────────────────
hdr "services/wizard-session.ts"
write "$SRC/services/wizard-session.ts" << 'EOF'
// services/wizard-session.ts — Multi-step formation wizard state
import type { D1Database } from "@cloudflare/workers-types";

export interface WizardSession {
  id: string;
  org_id: string;
  user_id: string;
  step: number;       // 0-based current step
  total_steps: number;
  data_json: string;  // accumulated form data
  completed: number;  // 0 | 1
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export async function createSession(db: D1Database, orgId: string, userId: string) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 7 * 86400000).toISOString(); // 7 days
  await db.prepare(`
    INSERT INTO bizforma_wizard_sessions
      (id, org_id, user_id, step, total_steps, data_json, completed, expires_at, created_at, updated_at)
    VALUES (?1,?2,?3,0,6,'{}',0,?4,?5,?5)
  `).bind(id, orgId, userId, expires, now).run();
  return getSession(db, id);
}

export async function getSession(db: D1Database, id: string) {
  return db.prepare("SELECT * FROM bizforma_wizard_sessions WHERE id = ?1").bind(id).first();
}

export async function updateSessionStep(
  db: D1Database, id: string, step: number, data: Record<string, unknown>
) {
  await db.prepare(`
    UPDATE bizforma_wizard_sessions
    SET step = ?1, data_json = ?2, updated_at = datetime('now')
    WHERE id = ?3
  `).bind(step, JSON.stringify(data), id).run();
}

export async function completeSession(db: D1Database, id: string) {
  await db.prepare(`
    UPDATE bizforma_wizard_sessions
    SET completed = 1, updated_at = datetime('now') WHERE id = ?1
  `).bind(id).run();
}

export async function purgeExpiredSessions(db: D1Database) {
  await db.prepare(
    "DELETE FROM bizforma_wizard_sessions WHERE expires_at < datetime('now') AND completed = 0"
  ).run();
}
EOF

# ─────────────────────────────────────────────────────────────────────────────
hdr "routes/formation.ts"
write "$SRC/routes/formation.ts" << 'EOF'
// routes/formation.ts — Business formation case API
import { Hono } from "hono";
import type { BizformaEnv } from "../types.js";
import {
  createCase, getCaseById, listCasesByOrg, updateCaseStatus
} from "../services/formation.js";
import { buildR2Key, uploadDocument } from "../services/document-store.js";

export const formation = new Hono<{ Bindings: BizformaEnv }>();

// GET /api/formation — list all cases for the org
formation.get("/", async (c) => {
  const orgId = c.get("orgId");
  const cases = await listCasesByOrg(c.env.DB, orgId);
  return c.json({ cases });
});

// POST /api/formation — create a new formation case
formation.post("/", async (c) => {
  const orgId  = c.get("orgId");
  const userId = c.get("userId");
  const body   = await c.req.json<{
    entity_type: string;
    state: string;
    business_name: string;
    registered_agent?: string;
  }>();

  if (!body.entity_type || !body.state || !body.business_name) {
    return c.json({ error: "entity_type, state, and business_name are required" }, 400);
  }

  const newCase = await createCase(c.env.DB, {
    org_id: orgId, user_id: userId,
    entity_type: body.entity_type,
    state: body.state,
    business_name: body.business_name,
    status: "draft",
    registered_agent: body.registered_agent,
  });

  c.env.ANALYTICS.writeDataPoint({
    blobs: [orgId, body.entity_type, body.state],
    indexes: ["formation_created"],
  });

  return c.json({ case: newCase }, 201);
});

// GET /api/formation/:id
formation.get("/:id", async (c) => {
  const { id } = c.req.param();
  const orgId  = c.get("orgId");
  const formationCase = await getCaseById(c.env.DB, id);
  if (!formationCase || (formationCase as { org_id: string }).org_id !== orgId) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json({ case: formationCase });
});

// PATCH /api/formation/:id/status
formation.patch("/:id/status", async (c) => {
  const { id }  = c.req.param();
  const { status } = await c.req.json<{ status: string }>();
  if (!status) return c.json({ error: "status required" }, 400);
  await updateCaseStatus(c.env.DB, id, status);
  return c.json({ ok: true, id, status });
});

// POST /api/formation/:id/documents — upload a document to R2
formation.post("/:id/documents", async (c) => {
  const { id } = c.req.param();
  const orgId  = c.get("orgId");
  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  const docType = formData.get("doc_type") as string ?? "document";

  if (!file) return c.json({ error: "file required" }, 400);

  const buffer   = await file.arrayBuffer();
  const r2Key    = buildR2Key(orgId, id, file.name);
  await uploadDocument(c.env.DOCUMENTS, r2Key, buffer, file.type);

  const docId = crypto.randomUUID();
  const now   = new Date().toISOString();
  await c.env.DB.prepare(`
    INSERT INTO bizforma_documents
      (id, case_id, org_id, doc_type, filename, r2_key, status, created_at, updated_at)
    VALUES (?1,?2,?3,?4,?5,?6,'pending',?7,?7)
  `).bind(docId, id, orgId, docType, file.name, r2Key, now).run();

  await c.env.PDF_QUEUE.send({ type: docType, doc_id: docId, r2_key: r2Key });

  return c.json({ ok: true, document_id: docId, r2_key: r2Key }, 201);
});

// GET /api/formation/:id/documents — list documents for a case
formation.get("/:id/documents", async (c) => {
  const { id } = c.req.param();
  const result = await c.env.DB.prepare(
    "SELECT * FROM bizforma_documents WHERE case_id = ?1 ORDER BY created_at DESC"
  ).bind(id).all();
  return c.json({ documents: result.results ?? [] });
});

// GET /api/formation/documents/:key/download — proxy R2 download
formation.get("/documents/:key/download", async (c) => {
  const key = decodeURIComponent(c.req.param("key"));
  const obj = await c.env.DOCUMENTS.get(key);
  if (!obj) return c.json({ error: "Not found" }, 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("Content-Disposition", `attachment; filename="${key.split("/").pop()}"`);
  return new Response(obj.body, { headers });
});
EOF

# ─────────────────────────────────────────────────────────────────────────────
hdr "routes/compliance.ts"
write "$SRC/routes/compliance.ts" << 'EOF'
// routes/compliance.ts — Compliance calendar events API
import { Hono } from "hono";
import type { BizformaEnv } from "../types.js";
import {
  listEventsByCase, listUpcomingEvents,
  createEvent, markEventComplete
} from "../services/compliance-calendar.js";

export const compliance = new Hono<{ Bindings: BizformaEnv }>();

// GET /api/compliance/upcoming — events due in next 30 days
compliance.get("/upcoming", async (c) => {
  const orgId = c.get("orgId");
  const days  = Number(c.req.query("days") ?? 30);
  const events = await listUpcomingEvents(c.env.DB, orgId, days);
  return c.json({ events });
});

// GET /api/compliance/case/:caseId
compliance.get("/case/:caseId", async (c) => {
  const { caseId } = c.req.param();
  const events = await listEventsByCase(c.env.DB, caseId);
  return c.json({ events });
});

// POST /api/compliance/case/:caseId — add a compliance event
compliance.post("/case/:caseId", async (c) => {
  const { caseId } = c.req.param();
  const orgId = c.get("orgId");
  const body  = await c.req.json<{
    event_type: string;
    title: string;
    due_date: string;
    notes?: string;
  }>();
  if (!body.event_type || !body.title || !body.due_date) {
    return c.json({ error: "event_type, title, due_date required" }, 400);
  }
  await createEvent(c.env.DB, {
    case_id: caseId, org_id: orgId,
    event_type: body.event_type,
    title: body.title,
    due_date: body.due_date,
    status: "pending",
    notes: body.notes,
  });
  return c.json({ ok: true }, 201);
});

// PATCH /api/compliance/events/:eventId/complete
compliance.patch("/events/:eventId/complete", async (c) => {
  const { eventId } = c.req.param();
  const { notes }   = await c.req.json<{ notes?: string }>();
  await markEventComplete(c.env.DB, eventId, notes);
  return c.json({ ok: true });
});
EOF

# ─────────────────────────────────────────────────────────────────────────────
hdr "routes/dashboard.ts"
write "$SRC/routes/dashboard.ts" << 'EOF'
// routes/dashboard.ts — BizForma dashboard summary
import { Hono } from "hono";
import type { BizformaEnv } from "../types.js";
import { listCasesByOrg } from "../services/formation.js";
import { listUpcomingEvents } from "../services/compliance-calendar.js";

export const dashboard = new Hono<{ Bindings: BizformaEnv }>();

// GET /api/dashboard — full dashboard payload
dashboard.get("/", async (c) => {
  const orgId = c.get("orgId");

  const [cases, upcoming] = await Promise.all([
    listCasesByOrg(c.env.DB, orgId),
    listUpcomingEvents(c.env.DB, orgId, 30),
  ]);

  type Case = { status: string };
  const stats = {
    total:    cases.length,
    active:   cases.filter((ca: Case) => ca.status === "active").length,
    draft:    cases.filter((ca: Case) => ca.status === "draft").length,
    filed:    cases.filter((ca: Case) => ca.status === "filed").length,
    overdue:  upcoming.filter((e: { status: string }) => e.status === "overdue").length,
    due_soon: upcoming.length,
  };

  return c.json({ stats, cases, upcoming_events: upcoming });
});
EOF

# ─────────────────────────────────────────────────────────────────────────────
hdr "routes/wizard.ts"
write "$SRC/routes/wizard.ts" << 'EOF'
// routes/wizard.ts — Multi-step formation wizard
import { Hono } from "hono";
import type { BizformaEnv } from "../types.js";
import {
  createSession, getSession, updateSessionStep, completeSession
} from "../services/wizard-session.js";
import { createCase } from "../services/formation.js";

export const wizard = new Hono<{ Bindings: BizformaEnv }>();

// POST /api/wizard/start — begin new wizard session
wizard.post("/start", async (c) => {
  const orgId  = c.get("orgId");
  const userId = c.get("userId");
  const session = await createSession(c.env.DB, orgId, userId);
  return c.json({ session }, 201);
});

// GET /api/wizard/:sessionId
wizard.get("/:sessionId", async (c) => {
  const { sessionId } = c.req.param();
  const session = await getSession(c.env.DB, sessionId);
  if (!session) return c.json({ error: "Session not found" }, 404);
  return c.json({ session });
});

// PATCH /api/wizard/:sessionId/step — save step data and advance
wizard.patch("/:sessionId/step", async (c) => {
  const { sessionId } = c.req.param();
  const body = await c.req.json<{ step: number; data: Record<string, unknown> }>();
  if (body.step === undefined || !body.data) {
    return c.json({ error: "step and data required" }, 400);
  }
  await updateSessionStep(c.env.DB, sessionId, body.step, body.data);
  return c.json({ ok: true, step: body.step });
});

// POST /api/wizard/:sessionId/complete — finalize + create formation case
wizard.post("/:sessionId/complete", async (c) => {
  const { sessionId } = c.req.param();
  const orgId  = c.get("orgId");
  const userId = c.get("userId");

  const session = await getSession(c.env.DB, sessionId) as {
    data_json: string; completed: number
  } | null;

  if (!session) return c.json({ error: "Session not found" }, 404);
  if (session.completed) return c.json({ error: "Session already completed" }, 409);

  const data = JSON.parse(session.data_json ?? "{}");

  const newCase = await createCase(c.env.DB, {
    org_id: orgId, user_id: userId,
    entity_type:    data.entity_type  ?? "LLC",
    state:          data.state        ?? "DE",
    business_name:  data.business_name ?? "Unnamed Business",
    status:         "draft",
    registered_agent: data.registered_agent,
    metadata_json:  JSON.stringify(data),
  });

  await completeSession(c.env.DB, sessionId);

  return c.json({ ok: true, case: newCase }, 201);
});
EOF

# ─────────────────────────────────────────────────────────────────────────────
hdr "routes/ai.ts"
write "$SRC/routes/ai.ts" << 'EOF'
// routes/ai.ts — AI-assisted formation guidance via Workers AI
import { Hono } from "hono";
import type { BizformaEnv } from "../types.js";

export const ai = new Hono<{ Bindings: BizformaEnv }>();

const SYSTEM_PROMPT = `You are BizForma AI, an expert business formation assistant.
You help small business owners choose the right entity structure, understand compliance
requirements, and navigate state-specific filing rules. Be concise, accurate, and
always recommend consulting a licensed attorney for final decisions.`;

// POST /api/ai/advise — free-form formation question
ai.post("/advise", async (c) => {
  const { question, context } = await c.req.json<{
    question: string;
    context?: { entity_type?: string; state?: string; business_name?: string };
  }>();

  if (!question) return c.json({ error: "question required" }, 400);

  const contextStr = context
    ? `Business context: ${JSON.stringify(context)}\n\n`
    : "";

  const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: `${contextStr}${question}` },
    ],
    max_tokens: 512,
  });

  const answer = (response as { response?: string }).response ?? "";

  c.env.ANALYTICS.writeDataPoint({
    blobs: [c.get("orgId"), "ai_advise"],
    indexes: ["ai_usage"],
  });

  return c.json({ answer });
});

// POST /api/ai/recommend-entity — structured entity type recommendation
ai.post("/recommend-entity", async (c) => {
  const body = await c.req.json<{
    description: string;
    state: string;
    owners: number;
    liability_concern: boolean;
    tax_preference?: string;
  }>();

  if (!body.description || !body.state) {
    return c.json({ error: "description and state required" }, 400);
  }

  const prompt = `A business owner needs entity formation advice.
Business description: ${body.description}
State: ${body.state}
Number of owners: ${body.owners ?? 1}
Liability concern: ${body.liability_concern ? "Yes" : "No"}
Tax preference: ${body.tax_preference ?? "not specified"}

Recommend the best entity type (LLC, S-Corp, C-Corp, Sole Proprietorship, or Partnership).
Respond with JSON: { "recommendation": "...", "reason": "...", "pros": [...], "cons": [...] }`;

  const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: prompt },
    ],
    max_tokens: 400,
  });

  const raw = (response as { response?: string }).response ?? "{}";
  let parsed: unknown = {};
  try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}"); } catch { parsed = { recommendation: raw }; }

  return c.json(parsed);
});

// GET /api/ai/compliance-summary/:caseId — plain-language compliance brief
ai.get("/compliance-summary/:caseId", async (c) => {
  const { caseId } = c.req.param();
  const orgId = c.get("orgId");

  const formationCase = await c.env.DB.prepare(
    "SELECT * FROM bizforma_cases WHERE id = ?1 AND org_id = ?2"
  ).bind(caseId, orgId).first<{ entity_type: string; state: string; business_name: string }>();

  if (!formationCase) return c.json({ error: "Case not found" }, 404);

  const events = await c.env.DB.prepare(
    "SELECT * FROM bizforma_compliance_events WHERE case_id = ?1 ORDER BY due_date ASC LIMIT 10"
  ).bind(caseId).all();

  const prompt = `Summarize upcoming compliance obligations for:
Entity: ${formationCase.entity_type} in ${formationCase.state}
Business: ${formationCase.business_name}
Upcoming events: ${JSON.stringify(events.results ?? [])}

Provide a brief plain-language summary of what the owner needs to do and when.`;

  const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: prompt },
    ],
    max_tokens: 350,
  });

  return c.json({ summary: (response as { response?: string }).response ?? "" });
});
EOF

# ─────────────────────────────────────────────────────────────────────────────
hdr "agents/formation-agent.ts"
write "$SRC/agents/formation-agent.ts" << 'EOF'
// agents/formation-agent.ts — Durable Object: long-running formation workflow
import { DurableObject } from "cloudflare:workers";
import type { BizformaEnv } from "../types.js";

interface AgentState {
  caseId: string;
  orgId: string;
  step: string;
  history: Array<{ ts: string; event: string; data?: unknown }>;
  createdAt: string;
}

export class FormationAgent extends DurableObject<BizformaEnv> {
  private state: AgentState | null = null;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/init":    return this.handleInit(request);
      case "/advance": return this.handleAdvance(request);
      case "/status":  return this.handleStatus();
      default:
        return new Response("Not found", { status: 404 });
    }
  }

  private async handleInit(request: Request): Promise<Response> {
    if (this.state) {
      return Response.json({ ok: false, error: "Agent already initialized", state: this.state });
    }
    const { caseId, orgId } = await request.json<{ caseId: string; orgId: string }>();
    this.state = {
      caseId, orgId,
      step: "intake",
      history: [{ ts: new Date().toISOString(), event: "agent_initialized" }],
      createdAt: new Date().toISOString(),
    };
    await this.ctx.storage.put("state", this.state);
    return Response.json({ ok: true, state: this.state });
  }

  private async handleAdvance(request: Request): Promise<Response> {
    if (!this.state) {
      this.state = await this.ctx.storage.get<AgentState>("state") ?? null;
    }
    if (!this.state) return Response.json({ error: "Not initialized" }, { status: 400 });

    const { event, data } = await request.json<{ event: string; data?: unknown }>();
    this.state.history.push({ ts: new Date().toISOString(), event, data });
    this.state.step = this.nextStep(this.state.step, event);
    await this.ctx.storage.put("state", this.state);

    return Response.json({ ok: true, step: this.state.step });
  }

  private async handleStatus(): Promise<Response> {
    if (!this.state) {
      this.state = await this.ctx.storage.get<AgentState>("state") ?? null;
    }
    return Response.json({ state: this.state });
  }

  private nextStep(current: string, event: string): string {
    const flow: Record<string, Record<string, string>> = {
      intake:      { submit: "name_check" },
      name_check:  { approved: "document_prep", rejected: "intake" },
      document_prep: { ready: "filing" },
      filing:      { submitted: "pending_state", rejected: "document_prep" },
      pending_state: { approved: "active", rejected: "filing" },
      active:      {},
    };
    return flow[current]?.[event] ?? current;
  }
}
EOF

# ─────────────────────────────────────────────────────────────────────────────
hdr "queues/reminder-consumer.ts"
write "$SRC/queues/reminder-consumer.ts" << 'EOF'
// queues/reminder-consumer.ts — Processes reminder jobs from the queue
import type { BizformaEnv } from "../types.js";

export interface ReminderJob {
  type: "compliance_reminder";
  case_id: string;
  event_id: string;
  user_id: string;
  org_id: string;
  due_date: string;
  title: string;
}

export async function processReminderBatch(
  batch: MessageBatch<ReminderJob>,
  env: BizformaEnv
): Promise<void> {
  for (const msg of batch.messages) {
    const job = msg.body;
    try {
      console.log(`[reminders] Sending reminder: ${job.title} due ${job.due_date}`);

      // Write notification to platform DB (cross-worker)
      await env.DB.prepare(`
        INSERT OR IGNORE INTO notifications
          (id, org_id, user_id, title, body, type, read, created_at)
        VALUES (?1,?2,?3,?4,?5,'warning',0,datetime('now'))
      `).bind(
        crypto.randomUUID(),
        job.org_id, job.user_id,
        `Compliance Due: ${job.title}`,
        `Action required by ${job.due_date}`,
      ).run();

      env.ANALYTICS.writeDataPoint({
        blobs: [job.org_id, job.event_id, "reminder_sent"],
        indexes: ["compliance_reminder"],
      });

      msg.ack();
    } catch (err) {
      console.error(`[reminders] Failed for event ${job.event_id}:`, err);
      msg.retry();
    }
  }
}

export async function dispatchUpcomingReminders(env: BizformaEnv): Promise<void> {
  const cutoff = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];

  const result = await env.DB.prepare(`
    SELECT e.*, c.org_id, c.user_id
    FROM bizforma_compliance_events e
    JOIN bizforma_cases c ON c.id = e.case_id
    WHERE e.status = 'pending' AND e.due_date <= ?1
  `).bind(cutoff).all<ReminderJob & { user_id: string; org_id: string }>();

  const jobs = result.results ?? [];
  console.log(`[reminders] Dispatching ${jobs.length} reminders`);

  for (const job of jobs) {
    await env.REMINDER_QUEUE.send({
      type: "compliance_reminder",
      case_id:  job.case_id,
      event_id: job.id,
      user_id:  job.user_id,
      org_id:   job.org_id,
      due_date: job.due_date,
      title:    job.title,
    } as ReminderJob);
  }
}
EOF

# ─────────────────────────────────────────────────────────────────────────────
hdr "D1 Migration"
write "$APP/migrations/0001_bizforma_schema.sql" << 'EOF'
-- apps/insighthunter-bizforma/migrations/0001_bizforma_schema.sql
-- BizForma: formation cases, documents, compliance events, wizard sessions

CREATE TABLE IF NOT EXISTS bizforma_cases (
  id                TEXT PRIMARY KEY,
  org_id            TEXT NOT NULL,
  user_id           TEXT NOT NULL,
  entity_type       TEXT NOT NULL,   -- LLC | S-Corp | C-Corp | Sole Proprietorship | Partnership
  state             TEXT NOT NULL,   -- 2-letter US state code
  business_name     TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft',
  registered_agent  TEXT,
  ein               TEXT,
  formation_date    TEXT,
  metadata_json     TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bizforma_documents (
  id          TEXT PRIMARY KEY,
  case_id     TEXT NOT NULL REFERENCES bizforma_cases(id) ON DELETE CASCADE,
  org_id      TEXT NOT NULL,
  doc_type    TEXT NOT NULL,
  filename    TEXT NOT NULL,
  r2_key      TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bizforma_compliance_events (
  id          TEXT PRIMARY KEY,
  case_id     TEXT NOT NULL REFERENCES bizforma_cases(id) ON DELETE CASCADE,
  org_id      TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  title       TEXT NOT NULL,
  due_date    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bizforma_wizard_sessions (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL,
  user_id      TEXT NOT NULL,
  step         INTEGER NOT NULL DEFAULT 0,
  total_steps  INTEGER NOT NULL DEFAULT 6,
  data_json    TEXT NOT NULL DEFAULT '{}',
  completed    INTEGER NOT NULL DEFAULT 0,
  expires_at   TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_biz_cases_org       ON bizforma_cases(org_id);
CREATE INDEX IF NOT EXISTS idx_biz_cases_status    ON bizforma_cases(status);
CREATE INDEX IF NOT EXISTS idx_biz_docs_case       ON bizforma_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_biz_events_case     ON bizforma_compliance_events(case_id, due_date);
CREATE INDEX IF NOT EXISTS idx_biz_events_org_due  ON bizforma_compliance_events(org_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_biz_wizard_org      ON bizforma_wizard_sessions(org_id, completed);
EOF

# ─────────────────────────────────────────────────────────────────────────────
hdr "public/index.html — BizForma Frontend"
write "$PUB/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BizForma — Business Formation</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #F8FAFC; color: #1E293B; }

    /* ── Nav ── */
    nav { display: flex; justify-content: space-between; align-items: center;
          padding: 1rem 2rem; background: #fff; border-bottom: 1px solid #E2E8F0; }
    .nav-logo { font-weight: 700; font-size: 1.1rem; color: #0891B2; }
    .nav-right { display: flex; gap: 1rem; align-items: center; }
    .btn { padding: 0.5rem 1.2rem; border-radius: 8px; font-size: 0.9rem;
           cursor: pointer; border: none; font-weight: 500; }
    .btn-primary { background: #0891B2; color: #fff; }
    .btn-ghost   { background: transparent; border: 1px solid #E2E8F0; color: #64748B; }
    .btn:hover   { opacity: 0.88; }

    /* ── Pages ── */
    .page { display: none; padding: 2rem; max-width: 1100px; margin: 0 auto; }
    .page.active { display: block; }

    /* ── Dashboard ── */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px,1fr));
                  gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 12px;
                 padding: 1.25rem; text-align: center; }
    .stat-val  { font-size: 2rem; font-weight: 700; color: #0891B2; }
    .stat-lbl  { font-size: 0.75rem; color: #94A3B8; text-transform: uppercase;
                 letter-spacing: 0.05em; margin-top: 0.25rem; }

    .section-title { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em;
                     color: #94A3B8; margin-bottom: 1rem; }
    .card-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .card-item { background: #fff; border: 1px solid #E2E8F0; border-radius: 10px;
                 padding: 1rem 1.25rem; display: flex; justify-content: space-between;
                 align-items: center; cursor: pointer; transition: border-color 0.15s; }
    .card-item:hover { border-color: #0891B2; }
    .card-name  { font-weight: 600; font-size: 0.95rem; }
    .card-meta  { font-size: 0.8rem; color: #64748B; margin-top: 0.15rem; }
    .badge { padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.7rem;
             font-weight: 600; text-transform: uppercase; }
    .badge-draft    { background: #F1F5F9; color: #64748B; }
    .badge-active   { background: #D1FAE5; color: #065F46; }
    .badge-filed    { background: #DBEAFE; color: #1D4ED8; }
    .badge-overdue  { background: #FEE2E2; color: #991B1B; }
    .badge-pending  { background: #FEF3C7; color: #92400E; }

    /* ── Wizard ── */
    .wizard-wrap { max-width: 640px; margin: 0 auto; }
    .wizard-steps { display: flex; gap: 0.5rem; margin-bottom: 2rem; }
    .step-dot { width: 32px; height: 32px; border-radius: 50%; display: flex;
                align-items: center; justify-content: center; font-size: 0.8rem;
                font-weight: 700; border: 2px solid #E2E8F0; color: #94A3B8; }
    .step-dot.active   { background: #0891B2; border-color: #0891B2; color: #fff; }
    .step-dot.complete { background: #D1FAE5; border-color: #059669; color: #065F46; }
    .wizard-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 14px;
                   padding: 2rem; }
    .form-group { margin-bottom: 1.25rem; }
    label { display: block; font-size: 0.85rem; font-weight: 500; margin-bottom: 0.4rem; }
    input, select, textarea {
      width: 100%; padding: 0.6rem 0.8rem; border: 1px solid #E2E8F0; border-radius: 8px;
      font-size: 0.9rem; outline: none; transition: border-color 0.15s;
    }
    input:focus, select:focus { border-color: #0891B2; }
    .wizard-nav { display: flex; justify-content: space-between; margin-top: 1.5rem; }

    /* ── AI Panel ── */
    .ai-panel { background: #fff; border: 1px solid #E2E8F0; border-radius: 14px; padding: 1.5rem; }
    .ai-messages { min-height: 200px; max-height: 380px; overflow-y: auto;
                   margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .msg { padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.875rem; line-height: 1.5; max-width: 85%; }
    .msg-user { background: #0891B2; color: #fff; align-self: flex-end; }
    .msg-ai   { background: #F1F5F9; color: #1E293B; align-self: flex-start; }
    .ai-input-row { display: flex; gap: 0.5rem; }
    .ai-input-row input { flex: 1; }

    /* ── Compliance ── */
    .event-item { background: #fff; border: 1px solid #E2E8F0; border-radius: 10px;
                  padding: 1rem 1.25rem; display: flex; justify-content: space-between;
                  align-items: center; }
    .event-due  { font-size: 0.8rem; color: #64748B; }

    /* ── Loading ── */
    .loading { text-align: center; padding: 3rem; color: #94A3B8; }
    .spinner { width: 1.5rem; height: 1.5rem; border: 3px solid #E2E8F0;
               border-top-color: #0891B2; border-radius: 50%;
               animation: spin 0.7s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Empty ── */
    .empty { text-align: center; padding: 3rem; color: #94A3B8; font-size: 0.9rem; }
  </style>
</head>
<body>

<nav>
  <span class="nav-logo">🏢 BizForma</span>
  <div class="nav-right">
    <button class="btn btn-ghost" onclick="showPage('compliance')">Compliance</button>
    <button class="btn btn-ghost" onclick="showPage('ai')">AI Advisor</button>
    <button class="btn btn-primary" onclick="showPage('wizard')">+ New Business</button>
  </div>
</nav>

<!-- ── Dashboard ── -->
<div id="page-dashboard" class="page active">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
    <h1 style="font-size:1.4rem;font-weight:700">Business Formation</h1>
    <button class="btn btn-primary" onclick="showPage('wizard')">+ Start Formation</button>
  </div>
  <div id="stats-grid" class="stats-grid"></div>
  <p class="section-title">Your Businesses</p>
  <div id="cases-list" class="card-list"><div class="loading"><span class="spinner"></span></div></div>
</div>

<!-- ── Wizard ── -->
<div id="page-wizard" class="page">
  <div class="wizard-wrap">
    <h2 style="font-size:1.2rem;font-weight:700;margin-bottom:1.5rem">Start a New Business</h2>
    <div class="wizard-steps" id="wizard-steps"></div>
    <div class="wizard-card" id="wizard-body"></div>
  </div>
</div>

<!-- ── Compliance ── -->
<div id="page-compliance" class="page">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
    <h2 style="font-size:1.2rem;font-weight:700">Compliance Calendar</h2>
    <span id="overdue-badge"></span>
  </div>
  <div id="compliance-list" class="card-list"><div class="loading"><span class="spinner"></span></div></div>
</div>

<!-- ── AI ── -->
<div id="page-ai" class="page">
  <h2 style="font-size:1.2rem;font-weight:700;margin-bottom:1.5rem">AI Formation Advisor</h2>
  <div class="ai-panel">
    <div class="ai-messages" id="ai-messages">
      <div class="msg msg-ai">Hi! I'm your BizForma AI advisor. Ask me anything about business formation, entity types, or compliance requirements.</div>
    </div>
    <div class="ai-input-row">
      <input id="ai-input" placeholder="Ask a question about forming your business…" onkeydown="if(event.key==='Enter')sendAI()" />
      <button class="btn btn-primary" onclick="sendAI()">Send</button>
    </div>
  </div>
</div>

<script>
const API = '';
const token = localStorage.getItem('ih_token') ?? 'dev-token';
const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

// ── Navigation ────────────────────────────────────────────────────────────

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${name}`).classList.add('active');
  if (name === 'dashboard')  loadDashboard();
  if (name === 'compliance') loadCompliance();
  if (name === 'wizard')     initWizard();
}

// ── Dashboard ─────────────────────────────────────────────────────────────

async function loadDashboard() {
  try {
    const res  = await fetch(`${API}/api/dashboard`, { headers });
    const data = await res.json();

    const sg = document.getElementById('stats-grid');
    sg.innerHTML = '';
    const stats = [
      { val: data.stats.total,    lbl: 'Total'    },
      { val: data.stats.active,   lbl: 'Active'   },
      { val: data.stats.draft,    lbl: 'Draft'    },
      { val: data.stats.filed,    lbl: 'Filed'    },
      { val: data.stats.due_soon, lbl: 'Due Soon' },
      { val: data.stats.overdue,  lbl: 'Overdue'  },
    ];
    for (const s of stats) {
      const div = document.createElement('div');
      div.className = 'stat-card';
      div.innerHTML = `<div class="stat-val">${s.val}</div><div class="stat-lbl">${s.lbl}</div>`;
      sg.appendChild(div);
    }

    const cl = document.getElementById('cases-list');
    cl.innerHTML = '';
    if (!data.cases?.length) {
      cl.innerHTML = '<div class="empty">No businesses yet. <a href="#" onclick="showPage(\'wizard\')">Start your first formation →</a></div>';
      return;
    }
    for (const c of data.cases) {
      const div = document.createElement('div');
      div.className = 'card-item';
      div.innerHTML = `
        <div>
          <div class="card-name">${c.business_name}</div>
          <div class="card-meta">${c.entity_type} · ${c.state}</div>
        </div>
        <span class="badge badge-${c.status}">${c.status}</span>`;
      cl.appendChild(div);
    }
  } catch (e) {
    document.getElementById('cases-list').innerHTML = '<div class="empty">Error loading data</div>';
  }
}

// ── Compliance ────────────────────────────────────────────────────────────

async function loadCompliance() {
  try {
    const res    = await fetch(`${API}/api/compliance/upcoming?days=60`, { headers });
    const { events } = await res.json();
    const list   = document.getElementById('compliance-list');
    list.innerHTML = '';

    const overdue = events.filter(e => e.status === 'overdue');
    const ob = document.getElementById('overdue-badge');
    if (overdue.length) {
      ob.innerHTML = `<span class="badge badge-overdue">${overdue.length} Overdue</span>`;
    }

    if (!events.length) {
      list.innerHTML = '<div class="empty">No upcoming compliance events</div>';
      return;
    }
    for (const e of events) {
      const div = document.createElement('div');
      div.className = 'event-item';
      div.innerHTML = `
        <div>
          <div class="card-name">${e.title}</div>
          <div class="event-due">Due: ${e.due_date} · ${e.event_type}</div>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center">
          <span class="badge badge-${e.status}">${e.status}</span>
          ${e.status !== 'completed' ? `<button class="btn btn-ghost" style="font-size:0.75rem;padding:0.25rem 0.6rem" onclick="completeEvent('${e.id}', this)">Done</button>` : ''}
        </div>`;
      list.appendChild(div);
    }
  } catch { document.getElementById('compliance-list').innerHTML = '<div class="empty">Error loading events</div>'; }
}

async function completeEvent(eventId, btn) {
  btn.disabled = true;
  await fetch(`${API}/api/compliance/events/${eventId}/complete`, {
    method: 'PATCH', headers, body: JSON.stringify({})
  });
  loadCompliance();
}

// ── Wizard ────────────────────────────────────────────────────────────────

const STEPS = [
  {
    title: 'Entity Type',
    fields: [
      { name: 'entity_type', label: 'Entity Type', type: 'select',
        options: ['LLC','S-Corp','C-Corp','Sole Proprietorship','Partnership'] },
    ]
  },
  {
    title: 'Business Info',
    fields: [
      { name: 'business_name', label: 'Business Name', type: 'text', placeholder: 'Acme LLC' },
      { name: 'state',         label: 'Formation State', type: 'select',
        options: ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
                  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
                  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
                  'VA','WA','WV','WI','WY'] },
    ]
  },
  {
    title: 'Registered Agent',
    fields: [
      { name: 'registered_agent', label: 'Registered Agent Name', type: 'text', placeholder: 'Your name or agent company' },
    ]
  },
  {
    title: 'AI Recommendation',
    ai: true,
  },
  {
    title: 'Review & Submit',
    review: true,
  },
];

let wizardStep = 0;
let wizardData = {};
let wizardSessionId = null;

async function initWizard() {
  wizardStep = 0;
  wizardData = {};
  wizardSessionId = null;

  try {
    const res = await fetch(`${API}/api/wizard/start`, { method: 'POST', headers, body: '{}' });
    const { session } = await res.json();
    wizardSessionId = session?.id;
  } catch (e) {
    wizardSessionId = 'local-' + crypto.randomUUID();
  }
  renderWizard();
}

function renderWizard() {
  const stepsEl = document.getElementById('wizard-steps');
  stepsEl.innerHTML = '';
  for (let i = 0; i < STEPS.length; i++) {
    const d = document.createElement('div');
    d.className = 'step-dot' + (i === wizardStep ? ' active' : i < wizardStep ? ' complete' : '');
    d.textContent = i < wizardStep ? '✓' : String(i + 1);
    stepsEl.appendChild(d);
  }

  const body   = document.getElementById('wizard-body');
  const step   = STEPS[wizardStep];
  body.innerHTML = `<h3 style="font-weight:600;margin-bottom:1.25rem">${step.title}</h3>`;

  if (step.ai) {
    body.innerHTML += `
      <div id="ai-rec-box" style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:10px;padding:1.25rem;margin-bottom:1rem;min-height:80px">
        <span class="spinner"></span> Getting AI recommendation…
      </div>`;
    getEntityRecommendation();
  } else if (step.review) {
    body.innerHTML += `<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:1.25rem;font-size:0.9rem">
      ${Object.entries(wizardData).map(([k,v]) => `<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid #F1F5F9"><span style="color:#64748B;text-transform:capitalize">${k.replace(/_/g,' ')}</span><span style="font-weight:600">${v}</span></div>`).join('')}
    </div>`;
  } else {
    for (const f of (step.fields ?? [])) {
      let input = '';
      if (f.type === 'select') {
        input = `<select name="${f.name}" onchange="wizardData['${f.name}']=this.value">
          <option value="">Select…</option>
          ${f.options.map(o => `<option value="${o}" ${wizardData[f.name]===o?'selected':''}>${o}</option>`).join('')}
        </select>`;
      } else {
        input = `<input type="${f.type}" name="${f.name}" placeholder="${f.placeholder??''}"
          value="${wizardData[f.name]??''}"
          oninput="wizardData['${f.name}']=this.value" />`;
      }
      body.innerHTML += `<div class="form-group"><label>${f.label}</label>${input}</div>`;
    }
  }

  const isLast = wizardStep === STEPS.length - 1;
  body.innerHTML += `
    <div class="wizard-nav">
      <button class="btn btn-ghost" onclick="wizardBack()" ${wizardStep===0?'disabled':''}>Back</button>
      <button class="btn btn-primary" onclick="${isLast ? 'submitWizard()' : 'wizardNext()'}">${isLast ? 'Submit' : 'Continue'}</button>
    </div>`;
}

async function wizardNext() {
  wizardStep++;
  if (wizardSessionId && !wizardSessionId.startsWith('local-')) {
    await fetch(`${API}/api/wizard/${wizardSessionId}/step`, {
      method: 'PATCH', headers, body: JSON.stringify({ step: wizardStep, data: wizardData })
    }).catch(() => {});
  }
  renderWizard();
}

function wizardBack() { if (wizardStep > 0) { wizardStep--; renderWizard(); } }

async function getEntityRecommendation() {
  const box = document.getElementById('ai-rec-box');
  try {
    const res = await fetch(`${API}/api/ai/recommend-entity`, {
      method: 'POST', headers,
      body: JSON.stringify({
        description: wizardData.business_name ?? 'small business',
        state: wizardData.state ?? 'DE',
        owners: 1,
        liability_concern: true,
      })
    });
    const data = await res.json();
    box.innerHTML = `
      <div style="font-weight:600;color:#0891B2;margin-bottom:0.5rem">
        Recommended: ${data.recommendation ?? 'LLC'}
      </div>
      <div style="font-size:0.85rem;color:#475569">${data.reason ?? ''}</div>`;
    if (data.recommendation) wizardData.entity_type ??= data.recommendation;
  } catch {
    box.innerHTML = '<span style="color:#94A3B8">AI recommendation unavailable</span>';
  }
}

async function submitWizard() {
  if (!wizardSessionId) return;
  try {
    const res = await fetch(`${API}/api/wizard/${wizardSessionId}/complete`, {
      method: 'POST', headers, body: '{}'
    });
    const data = await res.json();
    if (data.ok) {
      alert(`✓ ${data.case.business_name} formation started!`);
      showPage('dashboard');
    }
  } catch { alert('Submission failed — try again'); }
}

// ── AI Advisor ────────────────────────────────────────────────────────────

async function sendAI() {
  const input   = document.getElementById('ai-input');
  const msgs    = document.getElementById('ai-messages');
  const question = input.value.trim();
  if (!question) return;

  input.value = '';
  msgs.innerHTML += `<div class="msg msg-user">${question}</div>`;
  msgs.innerHTML += `<div class="msg msg-ai" id="ai-thinking"><span class="spinner"></span></div>`;
  msgs.scrollTop = msgs.scrollHeight;

  try {
    const res  = await fetch(`${API}/api/ai/advise`, {
      method: 'POST', headers,
      body: JSON.stringify({ question })
    });
    const data = await res.json();
    document.getElementById('ai-thinking').innerHTML = data.answer ?? 'No response';
  } catch {
    document.getElementById('ai-thinking').innerHTML = 'Error reaching AI — try again';
  }
  msgs.scrollTop = msgs.scrollHeight;
}

// ── Init ──────────────────────────────────────────────────────────────────
loadDashboard();
</script>
</body>
</html>
EOF

# ─────────────────────────────────────────────────────────────────────────────
hdr "Done"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  BizForma scaffold complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Files written:"
echo "  $SRC/middleware/auth.ts"
echo "  $SRC/services/formation.ts"
echo "  $SRC/services/compliance-calendar.ts"
echo "  $SRC/services/document-store.ts"
echo "  $SRC/services/wizard-session.ts"
echo "  $SRC/routes/formation.ts"
echo "  $SRC/routes/compliance.ts"
echo "  $SRC/routes/dashboard.ts"
echo "  $SRC/routes/wizard.ts"
echo "  $SRC/routes/ai.ts"
echo "  $SRC/agents/formation-agent.ts"
echo "  $SRC/queues/reminder-consumer.ts"
echo "  $APP/migrations/0001_bizforma_schema.sql"
echo "  $PUB/index.html"
echo ""
echo "Next steps:"
echo "  1. ./scripts/install-bizforma.sh --remote"
echo "  2. wrangler secret put JWT_SECRET --name insighthunter-bizforma"
echo "  3. wrangler deploy (inside apps/insighthunter-bizforma)"
