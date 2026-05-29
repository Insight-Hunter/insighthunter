import { Hono } from "hono";
import { storeDocument, makeDocumentKey } from "../services/documentService";

export const documentsApi = new Hono();

documentsApi.post("/upload", async (c) => {
  const body = await c.req.json<{
    formationCaseId: string;
    slug?: string;
    content: string;
    contentType?: string;
  }>();

  if (!body.formationCaseId || !body.content) {
    return c.json({ error: "formationCaseId and content are required" }, 400);
  }

  const key = makeDocumentKey(body.formationCaseId, body.slug || "document");
  await storeDocument(c.env, key, body.content, body.contentType ?? "text/html");

  return c.json({
    key,
    path: `/api/documents/file?key=${encodeURIComponent(key)}`,
  }, 201);
});

documentsApi.get("/file", async (c) => {
  const key = c.req.query("key");
  if (!key) return c.json({ error: "missing key" }, 400);

  const obj = await c.env.DOCUMENTS.get(key);
  if (!obj) return c.json({ error: "not found" }, 404);

  return new Response(await obj.text(), {
    headers: {
      "content-type": obj.httpMetadata?.contentType || "text/html",
    },
  });
});
