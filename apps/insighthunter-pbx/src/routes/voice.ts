// apps/insighthunter-pbx/src/routes/voice.ts
import { Hono } from "hono";
import type { Env } from "../index.js";
import { verifyTwilioSignature } from "../services/twilio-signature.js";

export const voice = new Hono<{ Bindings: Env }>();

voice.post("/inbound", async (c) => {
  const valid = await verifyTwilioSignature(c.req.raw, c.env.TWILIO_AUTH_TOKEN);
  if (!valid) return c.text("Forbidden", 403);

  const form = await c.req.formData();
  const orgId = new URL(c.req.url).searchParams.get("org"); // routed per-number in Twilio console

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thanks for calling. Please leave a message after the tone.</Say>
  <Record maxLength="120" action="/voice/recording-complete?org=${orgId}" playBeep="true" />
</Response>`;
  return c.text(twiml, 200, { "Content-Type": "text/xml" });
});

voice.post("/recording-complete", async (c) => {
  const valid = await verifyTwilioSignature(c.req.raw, c.env.TWILIO_AUTH_TOKEN);
  if (!valid) return c.text("Forbidden", 403);

  const form = await c.req.formData();
  const orgId = new URL(c.req.url).searchParams.get("org");
  const recordingUrl = form.get("RecordingUrl");
  const from = form.get("From");

  if (recordingUrl && orgId) {
    await c.env.DB.prepare(
      `INSERT INTO voicemails (org_id, from_number, recording_url, created_at, status)
       VALUES (?1, ?2, ?3, ?4, 'unread')`,
    )
      .bind(orgId, String(from), String(recordingUrl), new Date().toISOString())
      .run();
  }
  return c.text('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 200, {
    "Content-Type": "text/xml",
  });
});
