import { Hono } from "hono";
import { getSession } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { TwilioTelephonyProvider } from "../providers/twilio/TwilioTelephonyProvider.js";
import { recordAuditEvent } from "../services/audit.js";
import type { Env } from "../types.js";
import { readJsonObject } from "../utils/http.js";
import { isE164 } from "../utils/phone.js";

export const numbers = new Hono<{ Bindings: Env }>();

numbers.get("/", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);

  const result = await c.env.DB.prepare(
    `SELECT id, phone_number AS phoneNumber, label, call_flow_id AS callFlowId, created_at AS createdAt
     FROM phone_numbers
     WHERE org_id = ?1
     ORDER BY created_at DESC, id DESC`,
  )
    .bind(session.orgId)
    .all();

  await recordAuditEvent(c.env.DB, {
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "phone_number.list",
    resourceType: "phone_number",
  });

  return c.json({ items: result.results ?? [] });
});

numbers.post("/", requireRole("owner", "admin"), async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);

  let input: unknown;
  try {
    input = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return c.json({ error: "invalid_request" }, 400);
  }

  const body = input as { phoneNumber?: unknown; label?: unknown };
  const { phoneNumber, label } = body;
  if (typeof phoneNumber !== "string" || !isE164(phoneNumber)) {
    return c.json({ error: "invalid_phone_number", expected: "E.164" }, 400);
  }
  if (
    label !== undefined &&
    label !== null &&
    (typeof label !== "string" || label.trim().length > 120)
  ) {
    return c.json({ error: "invalid_label", maxLength: 120 }, 400);
  }

  let providerNumber: Awaited<ReturnType<TwilioTelephonyProvider["findIncomingNumber"]>>;
  try {
    providerNumber = await new TwilioTelephonyProvider().findIncomingNumber(
      phoneNumber,
      c.env.TWILIO_ACCOUNT_SID,
      c.env.TWILIO_AUTH_TOKEN,
    );
  } catch (error) {
    console.error("Twilio number ownership check failed", error);
    return c.json({ error: "provider_verification_unavailable" }, 502);
  }
  if (!providerNumber) {
    return c.json({ error: "number_not_in_provider_account" }, 422);
  }

  const createdAt = new Date().toISOString();
  const inserted = await c.env.DB.prepare(
    `INSERT INTO phone_numbers (org_id, phone_number, label, created_at)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(phone_number) DO NOTHING`,
  )
    .bind(
      session.orgId,
      phoneNumber,
      typeof label === "string" ? label.trim() || null : null,
      createdAt,
    )
    .run();

  if (inserted.meta.changes === 0) {
    return c.json({ error: "phone_number_unavailable" }, 409);
  }

  await recordAuditEvent(c.env.DB, {
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "phone_number.register",
    resourceType: "phone_number",
    resourceId: phoneNumber,
    metadata: { provider: "twilio", providerNumberId: providerNumber.providerNumberId },
  });

  return c.json(
    {
      item: {
        phoneNumber,
        label: typeof label === "string" ? label.trim() || null : null,
        createdAt,
      },
    },
    201,
  );
});

// Assign (or clear) the call flow that answers inbound calls on a number.
numbers.put("/:id/flow", requireRole("owner", "admin"), async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: "invalid_id" }, 400);

  const body = await readJsonObject(c.req.raw);
  const flowId = body?.["flowId"];
  if (flowId !== null && (typeof flowId !== "number" || !Number.isInteger(flowId))) {
    return c.json({ error: "invalid_flow_id" }, 400);
  }

  if (flowId !== null) {
    const flow = await c.env.DB.prepare(
      "SELECT published_version AS version FROM call_flows WHERE org_id = ?1 AND id = ?2",
    )
      .bind(session.orgId, flowId)
      .first<{ version: number | null }>();
    if (!flow) return c.json({ error: "flow_not_found" }, 404);
    if (flow.version === null) return c.json({ error: "flow_not_published" }, 409);
  }

  const updated = await c.env.DB.prepare(
    "UPDATE phone_numbers SET call_flow_id = ?1 WHERE org_id = ?2 AND id = ?3",
  )
    .bind(flowId, session.orgId, id)
    .run();
  if (updated.meta.changes === 0) return c.json({ error: "not_found" }, 404);

  await recordAuditEvent(c.env.DB, {
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "phone_number.assign_flow",
    resourceType: "phone_number",
    resourceId: String(id),
    metadata: { flowId },
  });
  return c.json({ item: { id, flowId } });
});
