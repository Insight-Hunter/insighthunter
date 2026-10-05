import { Hono } from "hono";
import type { AppBindings } from "../types.js";
import { badRequest, notFound, ok } from "../utils/http.js";
import { createCaseSchema, statusSchema } from "../utils/validators.js";
import { createCase, getCaseById, listCasesByOrg, updateCaseStatus, assertCaseOwnership } from "../services/case-service.js";
import { buildR2Key, createDocumentRecord, listDocumentsByCase, uploadDocumentObject } from "../services/document-service.js";
import { writeAuditEvent } from "../services/audit-service.js";
import { track } from "../utils/analytics.js";

export const formation = new Hono<AppBindings>();

formation.get("/", async (c) => {
  const cases = await listCasesByOrg(c.env, c.get("orgId"));
  return ok(c, { cases });
});

formation.post("/", async (c) => {
  const parsed = createCaseSchema.safeParse(await c.req.json());
  if (!parsed.success) return badRequest(c, "Invalid payload", parsed.error.flatten());

  const newCase = await createCase(c.env, {
    org_id: c.get("orgId"),
    user_id: c.get("userId"),
    ...parsed.data
  });

  const caseId = String((newCase as { id?: string } | null)?.id ?? "");
  if (caseId) {
    const agentId = c.env.FORMATION_AGENT.idFromName(`${c.get("orgId")}:${caseId}`);
    await c.env.FORMATION_AGENT.get(agentId).fetch("https://formation-agent/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: c.get("orgId"), caseId, status: "draft" })
    });
  }

  track(c.env, "formation_created", c.get("orgId"), parsed.data.entity_type, parsed.data.state);
  await writeAuditEvent(c.env, {
    org_id: c.get("orgId"),
    user_id: c.get("userId"),
    entity_type: "case",
    entity_id: caseId,
    action: "case_created",
    metadata: parsed.data
  });

  return ok(c, { case: newCase }, 201);
});

formation.get("/:id", async (c) => {
  const item = await getCaseById(c.env, c.req.param("id"), c.get("orgId"));
  if (!item) return notFound(c);
  return ok(c, { case: item });
});

formation.patch("/:id/status", async (c) => {
  const parsed = statusSchema.safeParse(await c.req.json());
  if (!parsed.success) return badRequest(c, "Invalid payload", parsed.error.flatten());

  const caseId = c.req.param("id");
  const owned = await assertCaseOwnership(c.env, caseId, c.get("orgId"));
  if (!owned) return notFound(c, "Case not found");

  await updateCaseStatus(c.env, caseId, c.get("orgId"), parsed.data.status);
  const agentId = c.env.FORMATION_AGENT.idFromName(`${c.get("orgId")}:${caseId}`);
  await c.env.FORMATION_AGENT.get(agentId).fetch("https://formation-agent/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgId: c.get("orgId"), caseId, status: parsed.data.status })
  });

  await writeAuditEvent(c.env, {
    org_id: c.get("orgId"),
    user_id: c.get("userId"),
    entity_type: "case",
    entity_id: caseId,
    action: "case_status_updated",
    metadata: parsed.data
  });

  return ok(c, { ok: true, id: caseId, status: parsed.data.status });
});

formation.post("/:id/documents", async (c) => {
  const caseId = c.req.param("id");
  const owned = await assertCaseOwnership(c.env, caseId, c.get("orgId"));
  if (!owned) return notFound(c, "Case not found");

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  const docType = String(formData.get("doc_type") ?? "document");
  if (!file) return badRequest(c, "file required");

  const buffer = await file.arrayBuffer();
  const key = buildR2Key(c.get("orgId"), caseId, file.name);

  await uploadDocumentObject(c.env, key, buffer, file.type || "application/octet-stream");
  const documentId = await createDocumentRecord(c.env, {
    case_id: caseId,
    org_id: c.get("orgId"),
    doc_type: docType,
    filename: file.name,
    r2_key: key,
    uploaded_by: c.get("userId")
  });

  await c.env.PDF_QUEUE.send({ type: docType, doc_id: documentId, r2_key: key });

  return ok(c, { ok: true, document_id: documentId, r2_key: key }, 201);
});

formation.get("/:id/documents", async (c) => {
  const caseId = c.req.param("id");
  const owned = await assertCaseOwnership(c.env, caseId, c.get("orgId"));
  if (!owned) return notFound(c, "Case not found");

  const documents = await listDocumentsByCase(c.env, caseId, c.get("orgId"));
  return ok(c, { documents });
});
