import { Hono } from "hono";
import type { BizformaEnv } from "../types.js";
import type { AuthContext } from "../middleware/auth.js";

type HonoEnv = { Bindings: BizformaEnv; Variables: { auth: AuthContext } };

const formation = new Hono<HonoEnv>();

// GET /api/formation — list all formation cases for the authenticated tenant
formation.get("/", async (c) => {
  const { tenantId } = c.get("auth");
  const { results } = await c.env.DB.prepare(
    `SELECT id, entity_type, business_name, state, status, wizard_step, created_at, updated_at
     FROM formation_cases WHERE tenant_id = ? ORDER BY created_at DESC`
  ).bind(tenantId).all();
  return c.json({ cases: results });
});

// GET /api/formation/:id — get a single formation case with documents and compliance events
formation.get("/:id", async (c) => {
  const { tenantId } = c.get("auth");
  const id = c.req.param("id");

  const formationCase = await c.env.DB.prepare(
    `SELECT * FROM formation_cases WHERE id = ? AND tenant_id = ?`
  ).bind(id, tenantId).first();

  if (!formationCase) return c.json({ error: "not_found" }, 404);

  const { results: documents } = await c.env.DB.prepare(
    `SELECT id, document_type, file_name, content_type, size_bytes, status, generated, created_at
     FROM bizforma_documents WHERE formation_case_id = ? ORDER BY created_at DESC`
  ).bind(id).all();

  const { results: compliance } = await c.env.DB.prepare(
    `SELECT id, event_type, title, due_date, status, completed_at
     FROM compliance_events WHERE formation_case_id = ? ORDER BY due_date ASC`
  ).bind(id).all();

  return c.json({ case: formationCase, documents, compliance });
});

// POST /api/formation — create a new formation case
formation.post("/", async (c) => {
  const { tenantId, userId } = c.get("auth");
  const body = await c.req.json<{
    entity_type: string;
    business_name: string;
    state: string;
    wizard_data?: Record<string, unknown>;
  }>();

  if (!body.entity_type || !body.business_name || !body.state) {
    return c.json({ error: "missing_required_fields", required: ["entity_type", "business_name", "state"] }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO formation_cases (id, tenant_id, user_id, entity_type, business_name, state, wizard_data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, tenantId, userId,
    body.entity_type, body.business_name, body.state,
    JSON.stringify(body.wizard_data ?? {}),
    now, now
  ).run();

  // Write analytics event
  c.env.ANALYTICS.writeDataPoint({
    blobs: [tenantId, userId, body.entity_type, body.state],
    indexes: ["formation_created"],
  });

  return c.json({ id, status: "draft", created_at: now }, 201);
});

// PATCH /api/formation/:id — update wizard step data or status
formation.patch("/:id", async (c) => {
  const { tenantId } = c.get("auth");
  const id = c.req.param("id");
  const body = await c.req.json<{
    wizard_step?: number;
    wizard_data?: Record<string, unknown>;
    status?: string;
    business_name?: string;
    ein?: string;
    sos_filing_number?: string;
    registered_agent?: string;
    principal_address?: string;
  }>();

  const existing = await c.env.DB.prepare(
    `SELECT id, wizard_data FROM formation_cases WHERE id = ? AND tenant_id = ?`
  ).bind(id, tenantId).first<{ id: string; wizard_data: string }>();

  if (!existing) return c.json({ error: "not_found" }, 404);

  // Merge wizard_data with existing
  const mergedData = body.wizard_data
    ? JSON.stringify({ ...JSON.parse(existing.wizard_data), ...body.wizard_data })
    : existing.wizard_data;

  await c.env.DB.prepare(
    `UPDATE formation_cases SET
      wizard_step = COALESCE(?, wizard_step),
      wizard_data = ?,
      status = COALESCE(?, status),
      business_name = COALESCE(?, business_name),
      ein = COALESCE(?, ein),
      sos_filing_number = COALESCE(?, sos_filing_number),
      registered_agent = COALESCE(?, registered_agent),
      principal_address = COALESCE(?, principal_address),
      updated_at = datetime('now')
     WHERE id = ? AND tenant_id = ?`
  ).bind(
    body.wizard_step ?? null,
    mergedData,
    body.status ?? null,
    body.business_name ?? null,
    body.ein ?? null,
    body.sos_filing_number ?? null,
    body.registered_agent ?? null,
    body.principal_address ?? null,
    id, tenantId
  ).run();

  return c.json({ id, updated: true });
});

// DELETE /api/formation/:id — soft-cancel a formation case
formation.delete("/:id", async (c) => {
  const { tenantId } = c.get("auth");
  const id = c.req.param("id");

  const existing = await c.env.DB.prepare(
    `SELECT id, status FROM formation_cases WHERE id = ? AND tenant_id = ?`
  ).bind(id, tenantId).first<{ id: string; status: string }>();

  if (!existing) return c.json({ error: "not_found" }, 404);
  if (existing.status === "filed" || existing.status === "approved") {
    return c.json({ error: "cannot_cancel_filed_case" }, 409);
  }

  await c.env.DB.prepare(
    `UPDATE formation_cases SET status = 'cancelled', updated_at = datetime('now') WHERE id = ? AND tenant_id = ?`
  ).bind(id, tenantId).run();

  return c.json({ id, status: "cancelled" });
});

// POST /api/formation/:id/documents/upload-url — get a signed R2 upload URL
formation.post("/:id/documents/upload-url", async (c) => {
  const { tenantId, userId } = c.get("auth");
  const id = c.req.param("id");
  const body = await c.req.json<{ file_name: string; content_type?: string; document_type?: string }>();

  const existing = await c.env.DB.prepare(
    `SELECT id FROM formation_cases WHERE id = ? AND tenant_id = ?`
  ).bind(id, tenantId).first();

  if (!existing) return c.json({ error: "not_found" }, 404);

  const docId = crypto.randomUUID();
  const r2Key = `${tenantId}/${id}/${docId}/${body.file_name}`;
  const now = new Date().toISOString();

  // Create DB record in pending state before upload
  await c.env.DB.prepare(
    `INSERT INTO bizforma_documents (id, formation_case_id, tenant_id, user_id, document_type, file_name, r2_key, content_type, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).bind(
    docId, id, tenantId, userId,
    body.document_type ?? "custom",
    body.file_name,
    r2Key,
    body.content_type ?? "application/pdf",
    now, now
  ).run();

  // R2 signed URLs for direct upload (Workers R2 createMultipartUpload or presigned)
  // For now return the doc id and key so the client can POST to /api/formation/:id/documents/:docId/confirm after upload
  return c.json({
    doc_id: docId,
    r2_key: r2Key,
    upload_url: `/api/formation/${id}/documents/${docId}/upload`,
    expires_in: 3600,
  }, 201);
});

// PUT /api/formation/:id/documents/:docId/upload — stream body directly into R2
formation.put("/:id/documents/:docId/upload", async (c) => {
  const { tenantId } = c.get("auth");
  const caseId = c.req.param("id");
  const docId = c.req.param("docId");

  const doc = await c.env.DB.prepare(
    `SELECT r2_key, content_type FROM bizforma_documents WHERE id = ? AND formation_case_id = ? AND tenant_id = ?`
  ).bind(docId, caseId, tenantId).first<{ r2_key: string; content_type: string }>();

  if (!doc) return c.json({ error: "not_found" }, 404);

  const body = c.req.raw.body;
  if (!body) return c.json({ error: "no_body" }, 400);

  await c.env.DOCUMENTS.put(doc.r2_key, body, {
    httpMetadata: { contentType: doc.content_type },
  });

  const size = parseInt(c.req.header("content-length") ?? "0");

  await c.env.DB.prepare(
    `UPDATE bizforma_documents SET status = 'uploaded', size_bytes = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(size, docId).run();

  // Queue PDF processing job
  await c.env.PDF_QUEUE.send({ type: "process_document", doc_id: docId, r2_key: doc.r2_key });

  c.env.ANALYTICS.writeDataPoint({
    blobs: [tenantId, caseId, docId, doc.content_type],
    indexes: ["doc_uploaded"],
  });

  return c.json({ doc_id: docId, status: "uploaded" });
});

export { formation };
