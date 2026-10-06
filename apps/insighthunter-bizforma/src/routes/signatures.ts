import { Hono } from "hono";
import type { AppBindings } from "../types.js";
import { badRequest, ok } from "../utils/http.js";
import { createSignatureRequest } from "../services/signature-service.js";

export const signatures = new Hono<AppBindings>();

signatures.post("/", async (c) => {
  const body = await c.req.json<{
    case_id: string;
    signer_name: string;
    signer_email: string;
    document_id?: string;
  }>();

  if (!body.case_id || !body.signer_name || !body.signer_email) {
    return badRequest(c, "case_id, signer_name, signer_email required");
  }

  const signatureId = await createSignatureRequest(c.env, {
    org_id: c.get("orgId"),
    ...body
  });

  return ok(c, { ok: true, signature_id: signatureId }, 201);
});
