import { Hono } from "hono";
import type { AppBindings } from "../types.js";
import { badRequest, ok } from "../utils/http.js";
import { createLicense, listLicensesByOrg } from "../services/license-service.js";

export const licenses = new Hono<AppBindings>();

licenses.get("/", async (c) => {
  const licenses = await listLicensesByOrg(c.env, c.get("orgId"));
  return ok(c, { licenses });
});

licenses.post("/", async (c) => {
  const body = await c.req.json<{
    case_id: string;
    name: string;
    issuing_authority?: string;
    renewal_date?: string;
    status?: string;
  }>();

  if (!body.case_id || !body.name) return badRequest(c, "case_id and name required");
  const licenseId = await createLicense(c.env, { org_id: c.get("orgId"), ...body });
  return ok(c, { ok: true, license_id: licenseId }, 201);
});
