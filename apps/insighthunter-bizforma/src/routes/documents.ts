import { Hono } from "hono";
import type { AppBindings } from "../types.js";
import { notFound, ok } from "../utils/http.js";
import { getDocumentById } from "../services/document-service.js";

export const documents = new Hono<AppBindings>();

documents.get("/:documentId", async (c) => {
  const doc = await getDocumentById(c.env, c.req.param("documentId"), c.get("orgId"));
  if (!doc) return notFound(c, "Document not found");
  return ok(c, { document: doc });
});

documents.get("/:documentId/download", async (c) => {
  const doc = await getDocumentById(c.env, c.req.param("documentId"), c.get("orgId")) as { r2_key: string; filename: string } | null;
  if (!doc) return notFound(c, "Document not found");

  const object = await c.env.BIZFORMA_DOCUMENTS.get(doc.r2_key);
  if (!object) return notFound(c, "File not found");

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Disposition", `attachment; filename="${doc.filename}"`);
  return new Response(object.body, { headers });
});
