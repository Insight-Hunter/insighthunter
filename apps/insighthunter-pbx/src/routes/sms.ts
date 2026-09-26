// apps/insighthunter-pbx/src/routes/sms.ts
import { Hono } from "hono";
import type { Env } from "../index.js";
import { getSession } from "../middleware/auth.js";

export const sms = new Hono<{ Bindings: Env }>();

sms.post("/send", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);

  const { to, body, fromNumber } = await c.req.json<{
    to: string;
    body: string;
    fromNumber: string;
  }>();
  const auth = btoa(`${c.env.TWILIO_ACCOUNT_SID}:${c.env.TWILIO_AUTH_TOKEN}`);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${c.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: fromNumber, Body: body }),
    },
  );
  const json = await res.json<{ sid?: string }>();
  if (!res.ok) return c.json({ error: "send_failed" }, 502);

  await c.env.DB.prepare(
    `INSERT INTO sms_log (org_id, to_number, from_number, body, twilio_sid, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
  )
    .bind(session.orgId, to, fromNumber, body, json.sid ?? null, new Date().toISOString())
    .run();

  return c.json({ ok: true, sid: json.sid });
});
