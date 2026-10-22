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
import type { CallFlowDefinition } from "../services/callFlowValidation.js";
import { type StepContext, renderFlowFrom, resolveNext } from "../services/callRoutingService.js";
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

  const assigned = await c.env.DB.prepare(
    `SELECT f.id AS flowId, f.published_version AS version
     FROM phone_numbers p JOIN call_flows f ON f.id = p.call_flow_id AND f.org_id = p.org_id
     WHERE p.phone_number = ?1 AND p.org_id = ?2 AND f.published_version IS NOT NULL`,
  )
    .bind(toNumber, tenant.orgId)
    .first<{ flowId: number; version: number }>();

  if (assigned && tenant.verified) {
    const def = await loadPublishedFlow(c.env.DB, tenant.orgId, assigned.flowId, assigned.version);
    if (def) {
      const ctx = flowContext(c.env.DB, c.req.url, tenant.orgId, assigned.flowId, assigned.version);
      return c.text(await renderFlowFrom(def, def.start, ctx), 200, { "Content-Type": "text/xml" });
    }
  }

  return c.text(voicemailPromptTwiml(tenant.orgId), 200, { "Content-Type": "text/xml" });
});

// Continuation of a running call flow. The query string is covered by the
// Twilio signature, but the flow is still loaded scoped to the org.
twilioVoiceWebhooks.post("/flow", async (c) => {
  const valid = await webhookVerifier.verifyWebhookSignature(c.req.raw, c.env.TWILIO_AUTH_TOKEN);
  if (!valid) return c.text("Forbidden", 403);

  const url = new URL(c.req.url);
  const orgId = url.searchParams.get("org") ?? "";
  const flowId = Number(url.searchParams.get("flow"));
  const version = Number(url.searchParams.get("v"));
  const node = url.searchParams.get("node") ?? "";
  const kind = url.searchParams.get("kind");
  if (
    !orgId ||
    !Number.isInteger(flowId) ||
    !Number.isInteger(version) ||
    (kind !== "menu" && kind !== "dial")
  ) {
    return c.text(SAFE_FALLBACK_TWIML, 200, { "Content-Type": "text/xml" });
  }

  const def = await loadPublishedFlow(c.env.DB, orgId, flowId, version);
  if (!def) return c.text(SAFE_FALLBACK_TWIML, 200, { "Content-Type": "text/xml" });

  const form = await c.req.formData();
  const digits = form.get("Digits");
  const dialStatus = form.get("DialCallStatus");
  const next = resolveNext(def, node, kind, {
    ...(typeof digits === "string" ? { digits } : {}),
    ...(typeof dialStatus === "string" ? { dialStatus } : {}),
  });
  const ctx = flowContext(c.env.DB, c.req.url, orgId, flowId, version);
  return c.text(await renderFlowFrom(def, next, ctx), 200, { "Content-Type": "text/xml" });
});

async function loadPublishedFlow(
  db: D1Database,
  orgId: string,
  flowId: number,
  version: number,
): Promise<CallFlowDefinition | null> {
  const row = await db
    .prepare(
      `SELECT definition FROM call_flow_versions
       WHERE org_id = ?1 AND flow_id = ?2 AND version = ?3 AND status = 'published'`,
    )
    .bind(orgId, flowId, version)
    .first<{ definition: string }>();
  return row ? (JSON.parse(row.definition) as CallFlowDefinition) : null;
}

function flowContext(
  db: D1Database,
  requestUrl: string,
  orgId: string,
  flowId: number,
  version: number,
): StepContext {
  const origin = new URL(requestUrl).origin;
  return {
    orgId,
    now: new Date(),
    stepUrl: (node, kind) => {
      const q = new URLSearchParams({
        org: orgId,
        flow: String(flowId),
        v: String(version),
        node,
        kind,
      });
      return `${origin}/voice/flow?${q.toString()}`;
    },
    voicemailAction: `/voice/recording-complete?org=${encodeURIComponent(orgId)}`,
    // Softphone identity convention: "<orgId>:<userId>" (token issuance not built yet).
    clientIdentityFor: async (extension) => {
      const row = await db
        .prepare(
          "SELECT user_id FROM extensions WHERE org_id = ?1 AND extension = ?2 AND kind = 'user'",
        )
        .bind(orgId, extension)
        .first<{ user_id: string | null }>();
      return row?.user_id ? `${orgId}:${row.user_id}` : null;
    },
  };
}

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
