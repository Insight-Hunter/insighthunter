// apps/insighthunter-pbx/src/backend/routes/webhooks.twilio.ts
//
// All inbound Twilio webhook handling lives in this one file, per
// docs/file-structure.md. It exports two Hono sub-apps — `twilioVoiceWebhooks`
// and `twilioSmsWebhooks` — mounted by backend/index.ts at the existing,
// documented Twilio console URLs (/voice/* and /webhooks/sms/*) so operator
// console configuration does not need to change.
import { Hono } from "hono";
import { isDuplicateWebhookEvent } from "../middleware/idempotency.js";
import { TwilioWebhookVerifier } from "../providers/twilio/TwilioWebhookVerifier.js";
import {
  EMPTY_TWIML,
  SAFE_FALLBACK_TWIML,
  smsReplyTwiml,
  voicemailPromptTwiml,
} from "../providers/twilio/twiml.js";
import { recordAuditEvent } from "../services/audit.js";
import { classifyKeyword, recordOptIn, recordOptOut } from "../services/consent.js";
import { resolveTenantForNumber } from "../services/tenant-resolution.js";
import { recordUsageEvent } from "../services/usage-ledger.js";
import type { Env } from "../types.js";

const webhookVerifier = new TwilioWebhookVerifier();

export const twilioVoiceWebhooks = new Hono<{ Bindings: Env }>();

twilioVoiceWebhooks.post("/inbound", async (c) => {
  const valid = await webhookVerifier.verifyWebhookSignature(c.req.raw, c.env.TWILIO_AUTH_TOKEN);
  if (!valid) return c.text("Forbidden", 403);

  const form = await c.req.formData();
  const url = new URL(c.req.url);
  const toNumber = String(form.get("To") ?? "");
  const callSid = String(form.get("CallSid") ?? "");
  const fallbackOrgId = url.searchParams.get("org"); // legacy: set per-number in Twilio console

  const tenant = await resolveTenantForNumber(c.env.DB, toNumber, fallbackOrgId);
  if (!tenant) {
    // Never fall through silently: a call with no resolvable tenant is an
    // operational event, not a routable call.
    return c.text(SAFE_FALLBACK_TWIML, 200, { "Content-Type": "text/xml" });
  }

  if (callSid && (await isDuplicateWebhookEvent(c.env.DB, "twilio", callSid))) {
    return c.text(EMPTY_TWIML, 200, { "Content-Type": "text/xml" });
  }

  await recordAuditEvent(c.env.DB, {
    orgId: tenant.orgId,
    action: "voice.inbound_call",
    resourceType: "call",
    resourceId: callSid || null,
    metadata: { toNumber, verified: tenant.verified },
  });

  return c.text(voicemailPromptTwiml(tenant.orgId), 200, { "Content-Type": "text/xml" });
});

twilioVoiceWebhooks.post("/recording-complete", async (c) => {
  const valid = await webhookVerifier.verifyWebhookSignature(c.req.raw, c.env.TWILIO_AUTH_TOKEN);
  if (!valid) return c.text("Forbidden", 403);

  const form = await c.req.formData();
  const orgId = new URL(c.req.url).searchParams.get("org");
  const recordingUrl = form.get("RecordingUrl");
  const recordingDuration = Number(form.get("RecordingDuration") ?? 0);
  const from = form.get("From");
  const callSid = String(form.get("CallSid") ?? "");

  if (recordingUrl && orgId) {
    if (callSid && (await isDuplicateWebhookEvent(c.env.DB, "twilio", `${callSid}:recording`))) {
      return c.text(EMPTY_TWIML, 200, { "Content-Type": "text/xml" });
    }

    await c.env.DB.prepare(
      `INSERT INTO voicemails (org_id, from_number, recording_url, created_at, status)
       VALUES (?1, ?2, ?3, ?4, 'unread')`,
    )
      .bind(orgId, String(from), String(recordingUrl), new Date().toISOString())
      .run();

    await recordUsageEvent(c.env.DB, {
      orgId,
      eventType: "voicemail.recording",
      resourceType: "call",
      resourceId: callSid || null,
      quantity: recordingDuration,
      unit: "seconds",
    });

    await recordAuditEvent(c.env.DB, {
      orgId,
      action: "voice.voicemail_recorded",
      resourceType: "voicemail",
      resourceId: callSid || null,
      metadata: { from: String(from ?? "") },
    });
  }
  return c.text(EMPTY_TWIML, 200, { "Content-Type": "text/xml" });
});

export const twilioSmsWebhooks = new Hono<{ Bindings: Env }>();

twilioSmsWebhooks.post("/inbound", async (c) => {
  const valid = await webhookVerifier.verifyWebhookSignature(c.req.raw, c.env.TWILIO_AUTH_TOKEN);
  if (!valid) return c.text("Forbidden", 403);

  const form = await c.req.formData();
  const url = new URL(c.req.url);
  const toNumber = String(form.get("To") ?? "");
  const fromNumber = String(form.get("From") ?? "");
  const messageSid = String(form.get("MessageSid") ?? form.get("SmsSid") ?? "");
  const body = String(form.get("Body") ?? "");
  const fallbackOrgId = url.searchParams.get("org");

  const tenant = await resolveTenantForNumber(c.env.DB, toNumber, fallbackOrgId);
  if (!tenant) return c.text(EMPTY_TWIML, 200, { "Content-Type": "text/xml" });

  if (messageSid && (await isDuplicateWebhookEvent(c.env.DB, "twilio", messageSid))) {
    return c.text(EMPTY_TWIML, 200, { "Content-Type": "text/xml" });
  }

  await c.env.DB.prepare(
    `INSERT INTO sms_inbound_log (org_id, from_number, to_number, body, twilio_sid, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
  )
    .bind(tenant.orgId, fromNumber, toNumber, body, messageSid || null, new Date().toISOString())
    .run();

  await recordUsageEvent(c.env.DB, {
    orgId: tenant.orgId,
    eventType: "sms.inbound",
    resourceType: "message",
    resourceId: messageSid || null,
    quantity: 1,
    unit: "segment",
  });

  const keyword = classifyKeyword(body);
  if (keyword === "stop") {
    await recordOptOut(c.env.DB, tenant.orgId, fromNumber);
    await recordAuditEvent(c.env.DB, {
      orgId: tenant.orgId,
      action: "sms.opt_out",
      resourceType: "message_suppression",
      resourceId: fromNumber,
    });
    return c.text(
      smsReplyTwiml(
        "You have been unsubscribed and will not receive further messages. Reply START to resubscribe.",
      ),
      200,
      { "Content-Type": "text/xml" },
    );
  }
  if (keyword === "start") {
    await recordOptIn(c.env.DB, tenant.orgId, fromNumber);
    await recordAuditEvent(c.env.DB, {
      orgId: tenant.orgId,
      action: "sms.opt_in",
      resourceType: "message_suppression",
      resourceId: fromNumber,
    });
    return c.text(smsReplyTwiml("You are resubscribed to messages from this number."), 200, {
      "Content-Type": "text/xml",
    });
  }
  if (keyword === "help") {
    return c.text(smsReplyTwiml("For help, contact support. Reply STOP to unsubscribe."), 200, {
      "Content-Type": "text/xml",
    });
  }

  await recordAuditEvent(c.env.DB, {
    orgId: tenant.orgId,
    action: "sms.inbound",
    resourceType: "message",
    resourceId: messageSid || null,
    metadata: { from: fromNumber },
  });

  return c.text(EMPTY_TWIML, 200, { "Content-Type": "text/xml" });
});
