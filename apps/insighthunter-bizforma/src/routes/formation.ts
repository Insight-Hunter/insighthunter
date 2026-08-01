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
