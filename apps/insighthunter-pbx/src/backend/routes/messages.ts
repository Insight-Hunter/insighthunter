// apps/insighthunter-pbx/src/backend/routes/messages.ts
import { Hono } from "hono";
import { getSession } from "../middleware/auth.js";
import { TwilioMessagingProvider } from "../providers/twilio/TwilioMessagingProvider.js";
import { recordAuditEvent } from "../services/audit.js";
import { isSuppressed } from "../services/consent.js";
import { recordUsageEvent } from "../services/usage-ledger.js";
import type { Env } from "../types.js";

export const messages = new Hono<{ Bindings: Env }>();

messages.post("/send", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);

  const { to, body, fromNumber } = await c.req.json<{
    to: string;
    body: string;
    fromNumber: string;
  }>();

  if (await isSuppressed(c.env.DB, session.orgId, to)) {
    return c.json({ error: "recipient_opted_out" }, 409);
  }

  const provider = new TwilioMessagingProvider(c.env.TWILIO_ACCOUNT_SID, c.env.TWILIO_AUTH_TOKEN);
  let result: Awaited<ReturnType<TwilioMessagingProvider["sendMessage"]>>;
  try {
    result = await provider.sendMessage({ to, from: fromNumber, body });
  } catch {
    return c.json({ error: "send_failed" }, 502);
  }

  await c.env.DB.prepare(
    `INSERT INTO sms_log (org_id, to_number, from_number, body, twilio_sid, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
  )
    .bind(session.orgId, to, fromNumber, body, result.providerMessageId, new Date().toISOString())
    .run();

  await recordUsageEvent(c.env.DB, {
    orgId: session.orgId,
    eventType: "sms.outbound",
    resourceType: "message",
    resourceId: result.providerMessageId,
    quantity: 1,
    unit: "segment",
  });

  await recordAuditEvent(c.env.DB, {
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "sms.send",
    resourceType: "message",
    resourceId: result.providerMessageId,
    metadata: { to, fromNumber },
  });

  return c.json({ ok: true, sid: result.providerMessageId });
});
