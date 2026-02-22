/**

- CloudPBX — White-Label PBX Reseller Platform
- Cloudflare Workers + Twilio + Workers AI
-
- Multi-tenant architecture: each customer account is fully isolated.
- Customers are provisioned via the /admin API and authenticate with
- per-account API keys. All Twilio webhooks are tenant-aware via
- the ?customerId= query parameter appended at provisioning time.
-
- Platform admin:  X-Admin-Key header  →  /admin/*  routes
- Customer access: X-API-Key header    →  /api/*    routes (scoped to their account)
  */

import { Hono, Context, Next } from "hono";
import { cors } from "hono/cors";
import twilio from "twilio";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiMessage {
role: "system" | "user" | "assistant";
content: string;
}

interface AiTextResponse {
response?: string;
}

export interface Env {
// Cloudflare bindings
VOICEMAIL_BUCKET: R2Bucket;
RECORDINGS_BUCKET: R2Bucket;
PBX_DB: D1Database;
SMS_CONVERSATIONS: KVNamespace;
CAMPAIGN_QUEUE: Queue;
AI: Ai;

// Twilio master account (wrangler secret put …)
TWILIO_ACCOUNT_SID: string;
TWILIO_AUTH_TOKEN: string;

// Platform config (wrangler.jsonc [vars])
BASE_URL: string;
ADMIN_API_KEY: string; // wrangler secret put ADMIN_API_KEY
AI_MODEL: string;      // e.g. @cf/meta/llama-3.1-8b-instruct
}

// ── Domain models ─────────────────────────────────────────────────────────────

interface Customer {
id: string;
name: string;
company_name: string;
email: string;
api_key: string;          // Bearer token for /api/* routes
status: "active" | "suspended" | "cancelled";
plan: "starter" | "professional" | "enterprise";
company_greeting: string;
created_at: string;
updated_at: string;
}

interface CustomerNumber {
id: string;
customer_id: string;
phone_number: string;     // E.164
twilio_sid: string;       // Twilio IncomingPhoneNumber SID
number_type: "toll_free" | "local";
friendly_name: string;
area_code: string;
active: number;
created_at: string;
}

interface Extension {
id: string;
customer_id: string;
name: string;
number: string;           // Local DID
ext: string;              // e.g. "101"
forward_to?: string;
forwardTo?: string;
email: string;
department: string;
active: boolean | number;
}

interface SMSConversation {
from: string;
customerId: string;
messages: Array<{ role: "user" | "assistant"; content: string; ts: number }>;
lastActive: number;
type: "ai" | "human";
}

interface RoutingDecision {
action: "transfer" | "voicemail" | "info" | "goodbye";
ext: string;
message: string;
reason: string;
}

// Hono context variables set by auth middleware
type Variables = {
customer: Customer;
};

// ─── Workers AI helpers ───────────────────────────────────────────────────────

async function aiChat(
ai: Ai,
model: string,
messages: AiMessage[],
fallback = ""
): Promise<string> {
try {
const result = (await ai.run(model as Parameters<Ai["run"]>[0], {
messages,
max_tokens: 512,
})) as AiTextResponse;
return result?.response?.trim() ?? fallback;
} catch (err) {
console.error("Workers AI error:", err);
return fallback;
}
}

function extractJson(text: string): string {
const match = text.match(/{[\s\S]*}/);
return match ? match[0] : text;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Generates a cryptographically secure API key with a recognisable prefix. */
function generateApiKey(): string {
const bytes = new Uint8Array(24);
crypto.getRandomValues(bytes);
const b64 = btoa(String.fromCharCode(...bytes))
.replace(/\+/g, "-")
.replace(/\//g, "_")
.replace(/=/g, "");
return `pbx_${b64}`;
}

function twimlResponse(xml: string): Response {
return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${xml}`, {
headers: { "Content-Type": "text/xml" },
});
}

// ─── App + Router setup ───────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
app.use("*", cors({ origin: "*" }));

// ── Admin auth middleware ──────────────────────────────────────────────────────

const adminAuth = async (c: Context, next: Next) => {
const key = c.req.header("X-Admin-Key");
if (!key || key !== c.env.ADMIN_API_KEY) {
return c.json({ error: "Unauthorized" }, 401);
}
await next();
};

// ── Customer auth middleware ───────────────────────────────────────────────────

const customerAuth = async (c: Context, next: Next) => {
const key = c.req.header("X-API-Key");
if (!key) return c.json({ error: "X-API-Key header required" }, 401);

const customer = await c.env.PBX_DB.prepare(
`SELECT * FROM customers WHERE api_key = ? AND status = 'active'`
)
.bind(key)
.first<Customer>();

if (!customer) return c.json({ error: "Invalid or inactive API key" }, 401);

c.set("customer", customer);
await next();
};

// ─── TwiML helpers ────────────────────────────────────────────────────────────

function buildMainGreeting(
customer: Customer,
extensions: Extension[],
baseUrl: string
): string {
const extMenu = extensions
.filter((e) => e.active)
.map(
(e) =>
`<Say>Press ${e.ext} for ${e.name} in ${e.department}.</Say>`
)
.join("\n");

return `<Response> <Gather numDigits="3" action="${baseUrl}/ivr/route?customerId=${customer.id}" timeout="8" finishOnKey=""> <Say voice="Polly.Joanna-Neural"> Thank you for calling ${customer.company_name}. ${customer.company_greeting} For our AI receptionist, press 0. ${extMenu} To repeat this menu, press 9. </Say> </Gather> <Redirect>${baseUrl}/ivr/inbound?customerId=${customer.id}</Redirect> </Response>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TWILIO WEBHOOK ROUTES  (public — Twilio calls these, not end users)
// Customer is identified via ?customerId= query param appended at provisioning
// ═══════════════════════════════════════════════════════════════════════════════

// ── Inbound call ──────────────────────────────────────────────────────────────

app.post("/ivr/inbound", async (c) => {
const env = c.env;
const customerId = c.req.query("customerId");
const form = await c.req.formData();
const to = form.get("To") as string;
const from = form.get("From") as string;

if (!customerId) return twimlResponse(`<Response><Hangup/></Response>`);

const customer = await env.PBX_DB.prepare(
`SELECT * FROM customers WHERE id = ? AND status = 'active'`
)
.bind(customerId)
.first<Customer>();

if (!customer) return twimlResponse(`<Response><Hangup/></Response>`);

await env.PBX_DB.prepare(
`INSERT INTO call_log (customer_id, from_number, to_number, direction, status, started_at) VALUES (?, ?, ?, 'inbound', 'ringing', datetime('now'))`
)
.bind(customerId, from, to)
.run();

// Check if this is a direct DID call to a specific extension
const ext = await env.PBX_DB.prepare(
`SELECT * FROM extensions WHERE customer_id = ? AND number = ? AND active = 1`
)
.bind(customerId, to)
.first<Extension>();

// Also check if the dialled number is the customer’s toll-free
const tollFree = await env.PBX_DB.prepare(
`SELECT * FROM customer_numbers WHERE customer_id = ? AND phone_number = ? AND number_type = 'toll_free'`
)
.bind(customerId, to)
.first<CustomerNumber>();

if (ext && !tollFree) {
// Direct DID → skip menu and connect
return twimlResponse(`<Response> <Say voice="Polly.Joanna-Neural">Please hold while we connect your call.</Say> <Dial timeout="20" action="${env.BASE_URL}/ivr/voicemail?customerId=${customerId}&ext=${ext.ext}"> ${ext.forward_to ? `<Number>${ext.forward_to}</Number>` : ""} <Client>${ext.id}</Client> </Dial> </Response>`);
}

// Toll-free or unrecognised DID → main IVR menu
const extensions = await env.PBX_DB.prepare(
`SELECT * FROM extensions WHERE customer_id = ? AND active = 1 ORDER BY ext`
)
.bind(customerId)
.all<Extension>();

return twimlResponse(buildMainGreeting(customer, extensions.results, env.BASE_URL));
});

// ── IVR digit routing ─────────────────────────────────────────────────────────

app.post("/ivr/route", async (c) => {
const env = c.env;
const customerId = c.req.query("customerId");
const form = await c.req.formData();
const digits = form.get("Digits") as string;

if (!customerId) return twimlResponse(`<Response><Hangup/></Response>`);

if (digits === "0") {
return twimlResponse(`<Response> <Say voice="Polly.Joanna-Neural">Connecting you to our AI receptionist.</Say> <Gather input="speech" action="${env.BASE_URL}/ivr/ai-receptionist?customerId=${customerId}" speechTimeout="auto" language="en-US" timeout="6"> <Say voice="Polly.Joanna-Neural">How can I help you today?</Say> </Gather> <Redirect>${env.BASE_URL}/ivr/inbound?customerId=${customerId}</Redirect> </Response>`);
}

if (digits === "9") {
return twimlResponse(`<Response> <Redirect>${env.BASE_URL}/ivr/inbound?customerId=${customerId}</Redirect> </Response>`);
}

const ext = await env.PBX_DB.prepare(
`SELECT * FROM extensions WHERE customer_id = ? AND ext = ? AND active = 1`
)
.bind(customerId, digits)
.first<Extension>();

if (!ext) {
return twimlResponse(`<Response> <Say voice="Polly.Joanna-Neural"> That extension was not found. Returning you to the main menu. </Say> <Redirect>${env.BASE_URL}/ivr/inbound?customerId=${customerId}</Redirect> </Response>`);
}

return twimlResponse(`<Response> <Say voice="Polly.Joanna-Neural"> Connecting you to ${ext.name} in ${ext.department}. Please hold. </Say> <Dial timeout="25" action="${env.BASE_URL}/ivr/voicemail?customerId=${customerId}&ext=${ext.ext}&name=${encodeURIComponent(ext.name)}"> ${ext.forward_to ? `<Number>${ext.forward_to}</Number>` : ""} <Client>${ext.id}</Client> </Dial> </Response>`);
});

// ── AI Receptionist ───────────────────────────────────────────────────────────

app.post("/ivr/ai-receptionist", async (c) => {
const env = c.env;
const customerId = c.req.query("customerId");
const form = await c.req.formData();
const speechResult = form.get("SpeechResult") as string;
const from = form.get("From") as string;
const callSid = form.get("CallSid") as string;
const model = env.AI_MODEL || "@cf/meta/llama-3.1-8b-instruct";

if (!customerId) return twimlResponse(`<Response><Hangup/></Response>`);

const customer = await env.PBX_DB.prepare(
`SELECT * FROM customers WHERE id = ? AND status = 'active'`
)
.bind(customerId)
.first<Customer>();

if (!customer) return twimlResponse(`<Response><Hangup/></Response>`);

if (!speechResult) {
return twimlResponse(`<Response> <Gather input="speech" action="${env.BASE_URL}/ivr/ai-receptionist?customerId=${customerId}" speechTimeout="auto" language="en-US" timeout="6"> <Say voice="Polly.Joanna-Neural">I didn't catch that. How can I help you?</Say> </Gather> <Redirect>${env.BASE_URL}/ivr/inbound?customerId=${customerId}</Redirect> </Response>`);
}

const extensions = await env.PBX_DB.prepare(
`SELECT * FROM extensions WHERE customer_id = ? AND active = 1`
)
.bind(customerId)
.all<Extension>();

const extList = extensions.results
.map((e) => `- Extension ${e.ext}: ${e.name} (${e.department})`)
.join("\n");

const rawResponse = await aiChat(
env.AI,
model,
[
{
role: "system",
content: `You are an AI phone receptionist for ${customer.company_name}.
Analyse the caller’s speech and return ONLY a JSON routing decision — no prose, no markdown.

Available extensions:
${extList}

Required JSON format:
{
"action": "transfer" | "voicemail" | "info" | "goodbye",
"ext": "101",
"message": "Short natural sentence to speak aloud to the caller.",
"reason": "Internal routing rationale."
}

Rules:

- "transfer": caller wants to speak with someone — pick the best matching extension.
- "voicemail": caller wants to leave a message — pick the most relevant extension.
- "info": general question — answer concisely in the message field.
- "goodbye": caller is done — say a warm farewell.
- Keep "message" conversational and under 2 sentences (it is read by TTS).`, }, { role: "user", content: `Caller said: “${speechResult}”` },
  ],
  JSON.stringify({
  action: "info",
  ext: "",
  message: "I’m sorry, I had some trouble. Let me connect you with someone who can help.",
  reason: "AI fallback",
  })
  );
  let routing: RoutingDecision = {
  action: "info",
  ext: "",
  message: "Let me connect you with the right person.",
  reason: "",
  };
  try {
  routing = JSON.parse(extractJson(rawResponse));
  } catch {
  console.error("Failed to parse AI routing JSON:", rawResponse);
  }
  await env.PBX_DB.prepare(
  `INSERT INTO ai_interactions (customer_id, call_sid, from_number, speech_input, routing_decision, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`
  )
  .bind(customerId, callSid, from, speechResult, JSON.stringify(routing))
  .run();
  if (routing.action === "transfer" && routing.ext) {
  const targetExt = extensions.results.find((e) => e.ext === routing.ext);
  return twimlResponse(`<Response> <Say voice="Polly.Joanna-Neural">${routing.message}</Say> <Dial timeout="25" action="${env.BASE_URL}/ivr/voicemail?customerId=${customerId}&ext=${routing.ext}"> ${targetExt?.forward_to ? `<Number>${targetExt.forward_to}</Number>` : ""} <Client>${targetExt?.id ?? routing.ext}</Client> </Dial> </Response>`);
  }
  if (routing.action === "voicemail" && routing.ext) {
  return twimlResponse(`<Response> <Say voice="Polly.Joanna-Neural">${routing.message}</Say> <Redirect>${env.BASE_URL}/ivr/voicemail?customerId=${customerId}&ext=${routing.ext}</Redirect> </Response>`);
  }
  if (routing.action === "goodbye") {
  return twimlResponse(`<Response> <Say voice="Polly.Joanna-Neural">${routing.message}</Say> <Hangup/> </Response>`);
  }
  return twimlResponse(`<Response> <Say voice="Polly.Joanna-Neural">${routing.message}</Say> <Gather input="speech" action="${env.BASE_URL}/ivr/ai-receptionist?customerId=${customerId}" speechTimeout="auto" language="en-US" timeout="6"> <Say voice="Polly.Joanna-Neural">Is there anything else I can help you with?</Say> </Gather> <Redirect>${env.BASE_URL}/ivr/inbound?customerId=${customerId}</Redirect> </Response>`);
  });

// ── Voicemail ─────────────────────────────────────────────────────────────────

app.post("/ivr/voicemail", async (c) => {
const env = c.env;
const customerId = c.req.query("customerId");
const ext = c.req.query("ext") || "general";
const name = c.req.query("name") || "our team";
const form = await c.req.formData();
const dialCallStatus = form.get("DialCallStatus") as string;

if (!customerId) return twimlResponse(`<Response><Hangup/></Response>`);

const customer = await env.PBX_DB.prepare(
`SELECT company_name FROM customers WHERE id = ?`
)
.bind(customerId)
.first<{ company_name: string }>();

if (dialCallStatus === "completed") return twimlResponse(`<Response></Response>`);

return twimlResponse(`<Response> <Say voice="Polly.Joanna-Neural"> I'm sorry, ${name} is unavailable. Please leave a message after the tone and we will return your call shortly. You may also hang up and send a text message to this number for a faster response. </Say> <Record maxLength="120" action="${env.BASE_URL}/ivr/voicemail-save?customerId=${customerId}&ext=${ext}" transcribe="true" transcribeCallback="${env.BASE_URL}/ivr/transcription?customerId=${customerId}" playBeep="true" /> <Say voice="Polly.Joanna-Neural">We did not receive a recording. Goodbye.</Say> </Response>`);
});

app.post("/ivr/voicemail-save", async (c) => {
const env = c.env;
const customerId = c.req.query("customerId");
const ext = c.req.query("ext") || "general";
const form = await c.req.formData();
const recordingUrl = form.get("RecordingUrl") as string;
const recordingSid = form.get("RecordingSid") as string;
const from = form.get("From") as string;
const duration = (form.get("RecordingDuration") as string) ?? "0";

if (!customerId) return twimlResponse(`<Response><Hangup/></Response>`);

const customer = await env.PBX_DB.prepare(
`SELECT company_name FROM customers WHERE id = ?`
)
.bind(customerId)
.first<{ company_name: string }>();

if (recordingUrl) {
const audioResp = await fetch(`${recordingUrl}.mp3`, {
headers: {
Authorization: "Basic " + btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`),
},
});
if (audioResp.ok) {
  // Namespace R2 keys by customer for easy listing/deletion
  const key = `voicemail/${customerId}/${ext}/${recordingSid}.mp3`;
  await env.VOICEMAIL_BUCKET.put(key, audioResp.body, {
    httpMetadata: { contentType: "audio/mpeg" },
    customMetadata: { customerId: customerId!, from, duration, ext, recordingSid },
  });

  await env.PBX_DB.prepare(
    `INSERT INTO voicemails (customer_id, recording_sid, from_number, extension, r2_key, duration_seconds, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  )
    .bind(customerId, recordingSid, from, ext, key, parseInt(duration))
    .run();
}
}

return twimlResponse(`<Response> <Say voice="Polly.Joanna-Neural"> Your message has been recorded. Thank you for calling ${customer?.company_name ?? "us"}. Goodbye. </Say> <Hangup/> </Response>`);
});

app.post("/ivr/transcription", async (c) => {
const customerId = c.req.query("customerId");
const form = await c.req.formData();
const transcriptionText = form.get("TranscriptionText") as string;
const recordingSid = form.get("RecordingSid") as string;

if (transcriptionText && recordingSid && customerId) {
await c.env.PBX_DB.prepare(
`UPDATE voicemails SET transcription = ? WHERE recording_sid = ? AND customer_id = ?`
)
.bind(transcriptionText, recordingSid, customerId)
.run();
}
return new Response("OK");
});

// ── Inbound SMS ───────────────────────────────────────────────────────────────

app.post("/sms/inbound", async (c) => {
const env = c.env;
const customerId = c.req.query("customerId");
const form = await c.req.formData();
const from = form.get("From") as string;
const to = form.get("To") as string;
const body = form.get("Body") as string;
const model = env.AI_MODEL || "@cf/meta/llama-3.1-8b-instruct";

if (!customerId) return new Response("OK");

const customer = await env.PBX_DB.prepare(
`SELECT * FROM customers WHERE id = ? AND status = 'active'`
)
.bind(customerId)
.first<Customer>();

if (!customer) return new Response("OK");

await env.PBX_DB.prepare(
`INSERT INTO sms_log (customer_id, from_number, to_number, body, direction, created_at) VALUES (?, ?, ?, ?, 'inbound', datetime('now'))`
)
.bind(customerId, from, to, body)
.run();

const lowerBody = body.trim().toLowerCase();
const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

// TCPA opt-out
if (["stop", "unsubscribe", "quit", "cancel", "end"].includes(lowerBody)) {
await env.PBX_DB.prepare(
`INSERT INTO sms_optouts (customer_id, phone_number, opted_out_at) VALUES (?, ?, datetime('now')) ON CONFLICT(customer_id, phone_number) DO UPDATE SET opted_out_at = datetime('now')`
)
.bind(customerId, from)
.run();
await twilioClient.messages.create({
  from: to,
  to: from,
  body: `You have been unsubscribed from ${customer.company_name} messages. Reply START to resubscribe.`,
});
return new Response("OK");
}

// TCPA opt-in
if (lowerBody === "start") {
await env.PBX_DB.prepare(
`DELETE FROM sms_optouts WHERE customer_id = ? AND phone_number = ?`
)
.bind(customerId, from)
.run();
await twilioClient.messages.create({
from: to,
to: from,
body: `Welcome back! You've been re-subscribed to ${customer.company_name} messages.`,
});
return new Response("OK");
}

// KV conversation is namespaced by customer
const convKey = `conv:${customerId}:${from}:${to}`;
const existingConv = await env.SMS_CONVERSATIONS.get(convKey);
let conversation: SMSConversation = existingConv
? JSON.parse(existingConv)
: { from, customerId, messages: [], lastActive: Date.now(), type: "ai" };

// Human handoff keywords
if (["human", "agent", "representative", "person", "operator"].some((w) => lowerBody.includes(w))) {
conversation.type = "human";
await env.SMS_CONVERSATIONS.put(convKey, JSON.stringify(conversation), { expirationTtl: 86400 * 7 });
await twilioClient.messages.create({
  from: to,
  to: from,
  body: `Got it! A team member from ${customer.company_name} will follow up shortly during business hours.`,
});

await env.PBX_DB.prepare(
  `INSERT INTO agent_handoffs (customer_id, from_number, to_number, reason, created_at)
   VALUES (?, ?, ?, 'customer_request', datetime('now'))`
)
  .bind(customerId, from, to)
  .run();

return new Response("OK");
}

if (conversation.type === "human") return new Response("OK");

// AI SMS reply
conversation.messages.push({ role: "user", content: body, ts: Date.now() });

const aiMessages: AiMessage[] = [
{
role: "system",
content: `You are a friendly SMS assistant for ${customer.company_name}. ${customer.company_greeting} Keep replies under 160 characters when possible, never more than 480 characters (3 SMS segments). Be warm, professional, and concise. Do not reveal you are an AI unless asked directly. If a question is too complex for SMS, offer to have a human follow up.`,
},
...conversation.messages.slice(-10).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
];

const replyText = await aiChat(
env.AI,
model,
aiMessages,
"Thanks for your message! A team member will follow up with you shortly."
);

conversation.messages.push({ role: "assistant", content: replyText, ts: Date.now() });
conversation.lastActive = Date.now();
await env.SMS_CONVERSATIONS.put(convKey, JSON.stringify(conversation), { expirationTtl: 86400 * 7 });

await twilioClient.messages.create({ from: to, to: from, body: replyText });

await env.PBX_DB.prepare(
`INSERT INTO sms_log (customer_id, from_number, to_number, body, direction, created_at) VALUES (?, ?, ?, ?, 'outbound', datetime('now'))`
)
.bind(customerId, to, from, replyText)
.run();

return new Response("OK");
});

// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM ADMIN API  — requires X-Admin-Key header
// Used by you (the reseller) to manage customer accounts
// ═══════════════════════════════════════════════════════════════════════════════

const admin = new Hono<{ Bindings: Env }>();
admin.use("*", adminAuth);

// ── Create customer account ───────────────────────────────────────────────────

admin.post("/customers", async (c) => {
const env = c.env;
const body = await c.req.json<{
name: string;
company_name: string;
email: string;
plan?: "starter" | "professional" | "enterprise";
company_greeting?: string;
}>();

if (!body.name || !body.company_name || !body.email) {
return c.json({ error: "name, company_name, and email are required" }, 400);
}

const id = crypto.randomUUID();
const apiKey = generateApiKey();

await env.PBX_DB.prepare(
`INSERT INTO customers (id, name, company_name, email, api_key, status, plan, company_greeting, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, datetime('now'), datetime('now'))`
)
.bind(
id,
body.name,
body.company_name,
body.email,
apiKey,
body.plan ?? "starter",
body.company_greeting ?? `Thank you for calling ${body.company_name}. How can we help you today?`
)
.run();

return c.json({
success: true,
customer: { id, name: body.name, company_name: body.company_name, email: body.email, api_key: apiKey, plan: body.plan ?? "starter" },
message: "Provide the api_key to the customer — it cannot be retrieved again.",
}, 201);
});

// ── List all customers ────────────────────────────────────────────────────────

admin.get("/customers", async (c) => {
const customers = await c.env.PBX_DB.prepare(
`SELECT id, name, company_name, email, status, plan, created_at, (SELECT COUNT(*) FROM customer_numbers WHERE customer_id = customers.id AND active = 1) as number_count, (SELECT COUNT(*) FROM extensions WHERE customer_id = customers.id AND active = 1) as extension_count FROM customers ORDER BY created_at DESC`
).all();
return c.json(customers.results);
});

// ── Get single customer ───────────────────────────────────────────────────────

admin.get("/customers/:id", async (c) => {
const customer = await c.env.PBX_DB.prepare(
`SELECT id, name, company_name, email, status, plan, company_greeting, created_at, updated_at FROM customers WHERE id = ?`
)
.bind(c.req.param("id"))
.first();
if (!customer) return c.json({ error: "Not found" }, 404);

const numbers = await c.env.PBX_DB.prepare(
`SELECT * FROM customer_numbers WHERE customer_id = ? AND active = 1`
)
.bind(c.req.param("id"))
.all();

const extensions = await c.env.PBX_DB.prepare(
`SELECT * FROM extensions WHERE customer_id = ? AND active = 1 ORDER BY ext`
)
.bind(c.req.param("id"))
.all();

return c.json({ customer, numbers: numbers.results, extensions: extensions.results });
});

// ── Update customer ───────────────────────────────────────────────────────────

admin.patch("/customers/:id", async (c) => {
const body = await c.req.json<Partial<Customer>>();
await c.env.PBX_DB.prepare(
`UPDATE customers SET name = COALESCE(?, name), company_name = COALESCE(?, company_name), email = COALESCE(?, email), status = COALESCE(?, status), plan = COALESCE(?, plan), company_greeting = COALESCE(?, company_greeting), updated_at = datetime('now') WHERE id = ?`
)
.bind(
body.name ?? null,
body.company_name ?? null,
body.email ?? null,
body.status ?? null,
body.plan ?? null,
body.company_greeting ?? null,
c.req.param("id")
)
.run();
return c.json({ success: true });
});

// ── Rotate API key ────────────────────────────────────────────────────────────

admin.post("/customers/:id/rotate-key", async (c) => {
const newKey = generateApiKey();
await c.env.PBX_DB.prepare(
`UPDATE customers SET api_key = ?, updated_at = datetime('now') WHERE id = ?`
)
.bind(newKey, c.req.param("id"))
.run();
return c.json({ success: true, api_key: newKey });
});

// ── Suspend / reactivate customer ─────────────────────────────────────────────

admin.post("/customers/:id/suspend", async (c) => {
await c.env.PBX_DB.prepare(
`UPDATE customers SET status = 'suspended', updated_at = datetime('now') WHERE id = ?`
)
.bind(c.req.param("id"))
.run();
return c.json({ success: true });
});

admin.post("/customers/:id/activate", async (c) => {
await c.env.PBX_DB.prepare(
`UPDATE customers SET status = 'active', updated_at = datetime('now') WHERE id = ?`
)
.bind(c.req.param("id"))
.run();
return c.json({ success: true });
});

// ── Provision a phone number for a customer ───────────────────────────────────
// Purchases a Twilio number and wires webhooks to this worker with ?customerId=

admin.post("/customers/:id/numbers", async (c) => {
const env = c.env;
const customerId = c.req.param("id");
const body = await c.req.json<{
type: "toll_free" | "local";
area_code?: string;       // for local numbers
country?: string;         // defaults to "US"
friendly_name?: string;
}>();

const customer = await env.PBX_DB.prepare(
`SELECT * FROM customers WHERE id = ? AND status = 'active'`
)
.bind(customerId)
.first<Customer>();

if (!customer) return c.json({ error: "Customer not found or suspended" }, 404);

const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
const country = body.country ?? "US";

// Build webhook URLs — include customerId so inbound routes know the tenant
const voiceUrl = `${env.BASE_URL}/ivr/inbound?customerId=${customerId}`;
const smsUrl = `${env.BASE_URL}/sms/inbound?customerId=${customerId}`;

let purchasedNumber: string;
let twilioSid: string;

try {
if (body.type === "toll_free") {
// Search for available toll-free numbers
const available = await twilioClient
.availablePhoneNumbers(country)
.tollFree.list({ limit: 1 });
  if (!available.length) {
    return c.json({ error: "No toll-free numbers available in this country" }, 422);
  }

  const purchased = await twilioClient.incomingPhoneNumbers.create({
    phoneNumber: available[0].phoneNumber,
    voiceUrl,
    smsUrl,
    friendlyName: body.friendly_name ?? `${customer.company_name} (Toll-Free)`,
  });

  purchasedNumber = purchased.phoneNumber;
  twilioSid = purchased.sid;
} else {
  // Local number
  if (!body.area_code) return c.json({ error: "area_code required for local numbers" }, 400);

  const available = await twilioClient
    .availablePhoneNumbers(country)
    .local.list({ areaCode: parseInt(body.area_code), limit: 1 });

  if (!available.length) {
    return c.json({ error: `No local numbers available in area code ${body.area_code}` }, 422);
  }

  const purchased = await twilioClient.incomingPhoneNumbers.create({
    phoneNumber: available[0].phoneNumber,
    voiceUrl,
    smsUrl,
    friendlyName: body.friendly_name ?? `${customer.company_name} (${body.area_code})`,
  });

  purchasedNumber = purchased.phoneNumber;
  twilioSid = purchased.sid;
}
} catch (err: any) {
console.error("Twilio provisioning error:", err);
return c.json({ error: "Twilio provisioning failed", detail: err?.message }, 502);
}

const numberId = crypto.randomUUID();
await env.PBX_DB.prepare(
`INSERT INTO customer_numbers (id, customer_id, phone_number, twilio_sid, number_type, friendly_name, area_code, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`
)
.bind(
numberId,
customerId,
purchasedNumber,
twilioSid,
body.type,
body.friendly_name ?? purchasedNumber,
body.area_code ?? ""
)
.run();

return c.json({
success: true,
number: {
id: numberId,
phone_number: purchasedNumber,
twilio_sid: twilioSid,
number_type: body.type,
voice_webhook: voiceUrl,
sms_webhook: smsUrl,
},
}, 201);
});

// ── List a customer’s numbers ─────────────────────────────────────────────────

admin.get("/customers/:id/numbers", async (c) => {
const numbers = await c.env.PBX_DB.prepare(
`SELECT * FROM customer_numbers WHERE customer_id = ? AND active = 1 ORDER BY created_at`
)
.bind(c.req.param("id"))
.all();
return c.json(numbers.results);
});

// ── Release (delete) a number ─────────────────────────────────────────────────

admin.delete("/customers/:id/numbers/:numberId", async (c) => {
const env = c.env;
const num = await env.PBX_DB.prepare(
`SELECT * FROM customer_numbers WHERE id = ? AND customer_id = ?`
)
.bind(c.req.param("numberId"), c.req.param("id"))
.first<CustomerNumber>();

if (!num) return c.json({ error: "Number not found" }, 404);

// Release from Twilio
try {
const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
await twilioClient.incomingPhoneNumbers(num.twilio_sid).remove();
} catch (err) {
console.error("Twilio release error:", err);
}

await env.PBX_DB.prepare(
`UPDATE customer_numbers SET active = 0 WHERE id = ?`
)
.bind(c.req.param("numberId"))
.run();

return c.json({ success: true });
});

// ── Platform-wide stats ───────────────────────────────────────────────────────

admin.get("/stats", async (c) => {
const [customers, numbers, calls, sms] = await Promise.all([
c.env.PBX_DB.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active FROM customers`).first<{ total: number; active: number }>(),
c.env.PBX_DB.prepare(`SELECT COUNT(*) as total FROM customer_numbers WHERE active = 1`).first<{ total: number }>(),
c.env.PBX_DB.prepare(`SELECT COUNT(*) as total FROM call_log WHERE started_at >= datetime('now', '-1 day')`).first<{ total: number }>(),
c.env.PBX_DB.prepare(`SELECT COUNT(*) as total FROM sms_log WHERE created_at >= datetime('now', '-1 day')`).first<{ total: number }>(),
]);

return c.json({
customers: { total: customers?.total ?? 0, active: customers?.active ?? 0 },
active_numbers: numbers?.total ?? 0,
calls_today: calls?.total ?? 0,
sms_today: sms?.total ?? 0,
});
});

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER API  — requires X-API-Key header (scoped to their account only)
// ═══════════════════════════════════════════════════════════════════════════════

const api = new Hono<{ Bindings: Env; Variables: Variables }>();
api.use("*", customerAuth);

// ── Account info ──────────────────────────────────────────────────────────────

api.get("/account", async (c) => {
const customer = c.get("customer");
const numbers = await c.env.PBX_DB.prepare(
`SELECT id, phone_number, number_type, friendly_name, area_code, created_at FROM customer_numbers WHERE customer_id = ? AND active = 1`
)
.bind(customer.id)
.all();

return c.json({
id: customer.id,
name: customer.name,
company_name: customer.company_name,
email: customer.email,
plan: customer.plan,
status: customer.status,
company_greeting: customer.company_greeting,
numbers: numbers.results,
});
});

api.patch("/account", async (c) => {
const customer = c.get("customer");
const body = await c.req.json<{ company_greeting?: string; name?: string; email?: string }>();

await c.env.PBX_DB.prepare(
`UPDATE customers SET name = COALESCE(?, name), email = COALESCE(?, email), company_greeting = COALESCE(?, company_greeting), updated_at = datetime('now') WHERE id = ?`
)
.bind(body.name ?? null, body.email ?? null, body.company_greeting ?? null, customer.id)
.run();

return c.json({ success: true });
});

// ── Extensions (scoped to customer) ──────────────────────────────────────────

api.get("/extensions", async (c) => {
const customer = c.get("customer");
const exts = await c.env.PBX_DB.prepare(
`SELECT * FROM extensions WHERE customer_id = ? ORDER BY ext`
)
.bind(customer.id)
.all();
return c.json(exts.results);
});

api.post("/extensions", async (c) => {
const env = c.env;
const customer = c.get("customer");
const body = await c.req.json<{
ext: string;
name: string;
department: string;
email: string;
forward_to?: string;
area_code?: string;
}>();

if (!body.ext || !body.name) return c.json({ error: "ext and name are required" }, 400);

// Verify the ext isn’t already taken within this customer’s account
const existing = await env.PBX_DB.prepare(
`SELECT id FROM extensions WHERE customer_id = ? AND ext = ?`
)
.bind(customer.id, body.ext)
.first();
if (existing) return c.json({ error: `Extension ${body.ext} is already in use` }, 409);

const id = crypto.randomUUID();
let localNumber = "";

// Auto-provision a local DID from the customer’s available numbers pool,
// or purchase a new one in the requested area code
try {
const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
const areaCode = body.area_code ?? "800";
const available = await twilioClient
.availablePhoneNumbers("US")
.local.list({ areaCode: parseInt(areaCode), limit: 1 });
if (available.length) {
  const voiceUrl = `${env.BASE_URL}/ivr/inbound?customerId=${customer.id}`;
  const smsUrl = `${env.BASE_URL}/sms/inbound?customerId=${customer.id}`;

  const purchased = await twilioClient.incomingPhoneNumbers.create({
    phoneNumber: available[0].phoneNumber,
    voiceUrl,
    smsUrl,
    friendlyName: `${customer.company_name} — Ext ${body.ext} (${body.name})`,
  });

  localNumber = purchased.phoneNumber;

  // Record this number in the customer's number inventory
  await env.PBX_DB.prepare(
    `INSERT INTO customer_numbers (id, customer_id, phone_number, twilio_sid, number_type, friendly_name, area_code)
     VALUES (?, ?, ?, ?, 'local', ?, ?)`
  )
    .bind(
      crypto.randomUUID(),
      customer.id,
      localNumber,
      purchased.sid,
      `Ext ${body.ext} — ${body.name}`,
      areaCode
    )
    .run();
}
} catch (err) {
console.error("Number provisioning for extension failed:", err);
}

await env.PBX_DB.prepare(
`INSERT INTO extensions (id, customer_id, name, number, ext, forward_to, email, department, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
)
.bind(id, customer.id, body.name, localNumber, body.ext, body.forward_to ?? null, body.email, body.department)
.run();

return c.json({ success: true, id, local_number: localNumber }, 201);
});

api.put("/extensions/:id", async (c) => {
const customer = c.get("customer");
const body = await c.req.json<Partial<Extension>>();

await c.env.PBX_DB.prepare(
`UPDATE extensions SET name = COALESCE(?, name), forward_to = COALESCE(?, forward_to), department = COALESCE(?, department), active = COALESCE(?, active) WHERE id = ? AND customer_id = ?`
)
.bind(
body.name ?? null,
body.forwardTo ?? body.forward_to ?? null,
body.department ?? null,
body.active !== undefined ? (body.active ? 1 : 0) : null,
c.req.param("id"),
customer.id
)
.run();

return c.json({ success: true });
});

api.delete("/extensions/:id", async (c) => {
const customer = c.get("customer");
await c.env.PBX_DB.prepare(
`UPDATE extensions SET active = 0 WHERE id = ? AND customer_id = ?`
)
.bind(c.req.param("id"), customer.id)
.run();
return c.json({ success: true });
});

// ── Voicemail (scoped to customer) ───────────────────────────────────────────

api.get("/voicemails", async (c) => {
const customer = c.get("customer");
const ext = c.req.query("ext");
const result = ext
? await c.env.PBX_DB.prepare(
`SELECT * FROM voicemails WHERE customer_id = ? AND extension = ? ORDER BY created_at DESC LIMIT 50`
)
.bind(customer.id, ext)
.all()
: await c.env.PBX_DB.prepare(
`SELECT * FROM voicemails WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50`
)
.bind(customer.id)
.all();
return c.json(result.results);
});

api.get("/voicemails/:id/audio", async (c) => {
const customer = c.get("customer");
const vm = await c.env.PBX_DB.prepare(
`SELECT r2_key FROM voicemails WHERE id = ? AND customer_id = ?`
)
.bind(c.req.param("id"), customer.id)
.first<{ r2_key: string }>();

if (!vm) return c.json({ error: "Not found" }, 404);

const obj = await c.env.VOICEMAIL_BUCKET.get(vm.r2_key);
if (!obj) return c.json({ error: "Audio not found" }, 404);

return new Response(obj.body, { headers: { "Content-Type": "audio/mpeg" } });
});

api.post("/voicemails/:id/listen", async (c) => {
const customer = c.get("customer");
await c.env.PBX_DB.prepare(
`UPDATE voicemails SET listened = 1, listened_at = datetime('now') WHERE id = ? AND customer_id = ?`
)
.bind(c.req.param("id"), customer.id)
.run();
return c.json({ success: true });
});

// ── SMS (scoped to customer) ──────────────────────────────────────────────────

api.post("/sms/send", async (c) => {
const env = c.env;
const customer = c.get("customer");
const body = await c.req.json<{ to: string; message: string; from?: string }>();

// Validate the “from” number belongs to this customer
if (body.from) {
const owned = await env.PBX_DB.prepare(
`SELECT id FROM customer_numbers WHERE customer_id = ? AND phone_number = ? AND active = 1`
)
.bind(customer.id, body.from)
.first();
if (!owned) return c.json({ error: "That number does not belong to your account" }, 403);
}

// Default to their first active number
const defaultNum = await env.PBX_DB.prepare(
`SELECT phone_number FROM customer_numbers WHERE customer_id = ? AND active = 1 ORDER BY created_at LIMIT 1`
)
.bind(customer.id)
.first<{ phone_number: string }>();

const fromNumber = body.from ?? defaultNum?.phone_number;
if (!fromNumber) return c.json({ error: "No active numbers on this account" }, 422);

const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
const msg = await twilioClient.messages.create({ from: fromNumber, to: body.to, body: body.message });

await env.PBX_DB.prepare(
`INSERT INTO sms_log (customer_id, from_number, to_number, body, direction, twilio_sid, created_at) VALUES (?, ?, ?, ?, 'outbound', ?, datetime('now'))`
)
.bind(customer.id, fromNumber, body.to, body.message, msg.sid)
.run();

return c.json({ success: true, sid: msg.sid });
});

api.get("/conversations", async (c) => {
const customer = c.get("customer");
const list = await c.env.SMS_CONVERSATIONS.list({ prefix: `conv:${customer.id}:` });
const conversations = await Promise.all(
list.keys.slice(0, 50).map(async (k) => {
const val = await c.env.SMS_CONVERSATIONS.get(k.name);
return val ? JSON.parse(val) : null;
})
);
return c.json(conversations.filter(Boolean));
});

api.post("/conversations/reply", async (c) => {
const env = c.env;
const customer = c.get("customer");
const body = await c.req.json<{ from: string; to: string; message: string }>();

// Validate the “to” (our side) number belongs to this customer
const owned = await env.PBX_DB.prepare(
`SELECT id FROM customer_numbers WHERE customer_id = ? AND phone_number = ? AND active = 1`
)
.bind(customer.id, body.to)
.first();
if (!owned) return c.json({ error: "That number does not belong to your account" }, 403);

const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
await twilioClient.messages.create({ from: body.to, to: body.from, body: body.message });

const convKey = `conv:${customer.id}:${body.from}:${body.to}`;
const existing = await env.SMS_CONVERSATIONS.get(convKey);
if (existing) {
const conv: SMSConversation = JSON.parse(existing);
conv.messages.push({ role: "assistant", content: body.message, ts: Date.now() });
conv.lastActive = Date.now();
await env.SMS_CONVERSATIONS.put(convKey, JSON.stringify(conv), { expirationTtl: 86400 * 7 });
}

await env.PBX_DB.prepare(
`INSERT INTO sms_log (customer_id, from_number, to_number, body, direction, created_at) VALUES (?, ?, ?, ?, 'outbound', datetime('now'))`
)
.bind(customer.id, body.to, body.from, body.message)
.run();

return c.json({ success: true });
});

// ── Campaigns (scoped to customer) ───────────────────────────────────────────

api.post("/campaigns", async (c) => {
const env = c.env;
const customer = c.get("customer");
const body = await c.req.json<{
name: string;
message: string;
recipients: string[];
from_number?: string;
scheduledAt?: number;
}>();

if (!body.name || !body.message || !body.recipients?.length) {
return c.json({ error: "name, message, and recipients are required" }, 400);
}

// Validate from_number belongs to this customer
if (body.from_number) {
const owned = await env.PBX_DB.prepare(
`SELECT id FROM customer_numbers WHERE customer_id = ? AND phone_number = ? AND active = 1`
)
.bind(customer.id, body.from_number)
.first();
if (!owned) return c.json({ error: "That number does not belong to your account" }, 403);
}

const defaultNum = await env.PBX_DB.prepare(
`SELECT phone_number FROM customer_numbers WHERE customer_id = ? AND active = 1 ORDER BY created_at LIMIT 1`
)
.bind(customer.id)
.first<{ phone_number: string }>();

const fromNumber = body.from_number ?? defaultNum?.phone_number;
if (!fromNumber) return c.json({ error: "No active numbers on this account" }, 422);

// Filter this customer’s opt-outs
const optouts = await env.PBX_DB.prepare(
`SELECT phone_number FROM sms_optouts WHERE customer_id = ?`
)
.bind(customer.id)
.all<{ phone_number: string }>();
const optoutSet = new Set(optouts.results.map((o) => o.phone_number));
const filtered = body.recipients.filter((r) => !optoutSet.has(r));

const campaignId = crypto.randomUUID();

await env.PBX_DB.prepare(
`INSERT INTO campaigns (id, customer_id, name, message, recipients, from_number, status, scheduled_at, total_recipients, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
)
.bind(
campaignId,
customer.id,
body.name,
body.message,
JSON.stringify(filtered),
fromNumber,
body.scheduledAt ? "scheduled" : "pending",
body.scheduledAt ?? null,
filtered.length
)
.run();

if (!body.scheduledAt) {
const batchSize = 10;
for (let i = 0; i < filtered.length; i += batchSize) {
await env.CAMPAIGN_QUEUE.send({
campaignId,
customerId: customer.id,
message: body.message,
fromNumber,
recipients: filtered.slice(i, i + batchSize),
});
}
await env.PBX_DB.prepare(`UPDATE campaigns SET status = 'sending' WHERE id = ?`)
.bind(campaignId)
.run();
}

return c.json({
success: true,
campaignId,
filteredCount: filtered.length,
optoutCount: body.recipients.length - filtered.length,
}, 201);
});

api.get("/campaigns", async (c) => {
const customer = c.get("customer");
const campaigns = await c.env.PBX_DB.prepare(
`SELECT * FROM campaigns WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50`
)
.bind(customer.id)
.all();
return c.json(campaigns.results);
});

// ── Analytics (scoped to customer) ───────────────────────────────────────────

api.get("/analytics/calls", async (c) => {
const customer = c.get("customer");
const period = c.req.query("period") || "7d";
const days = period === "30d" ? 30 : period === "90d" ? 90 : 7;

const stats = await c.env.PBX_DB.prepare(`SELECT date(started_at) as date, COUNT(*) as total, SUM(CASE WHEN direction='inbound' THEN 1 ELSE 0 END) as inbound, SUM(CASE WHEN direction='outbound' THEN 1 ELSE 0 END) as outbound, AVG(duration_seconds) as avg_duration FROM call_log WHERE customer_id = ? AND started_at >= datetime('now', '-${days} days') GROUP BY date(started_at) ORDER BY date`)
.bind(customer.id)
.all();

return c.json(stats.results);
});

api.get("/analytics/sms", async (c) => {
const customer = c.get("customer");
const stats = await c.env.PBX_DB.prepare(`SELECT date(created_at) as date, COUNT(*) as total, SUM(CASE WHEN direction='inbound' THEN 1 ELSE 0 END) as inbound, SUM(CASE WHEN direction='outbound' THEN 1 ELSE 0 END) as outbound FROM sms_log WHERE customer_id = ? AND created_at >= datetime('now', '-7 days') GROUP BY date(created_at) ORDER BY date`)
.bind(customer.id)
.all();
return c.json(stats.results);
});

api.get("/dashboard", async (c) => {
const customer = c.get("customer");
const [calls, sms, vms, campaigns, numbers] = await Promise.all([
c.env.PBX_DB.prepare(`SELECT COUNT(*) as total FROM call_log WHERE customer_id = ? AND started_at >= datetime('now', '-1 day')`).bind(customer.id).first<{ total: number }>(),
c.env.PBX_DB.prepare(`SELECT COUNT(*) as total FROM sms_log WHERE customer_id = ? AND created_at >= datetime('now', '-1 day')`).bind(customer.id).first<{ total: number }>(),
c.env.PBX_DB.prepare(`SELECT COUNT(*) as total FROM voicemails WHERE customer_id = ? AND listened = 0`).bind(customer.id).first<{ total: number }>(),
c.env.PBX_DB.prepare(`SELECT COUNT(*) as total FROM campaigns WHERE customer_id = ? AND status = 'sending'`).bind(customer.id).first<{ total: number }>(),
c.env.PBX_DB.prepare(`SELECT COUNT(*) as total FROM customer_numbers WHERE customer_id = ? AND active = 1`).bind(customer.id).first<{ total: number }>(),
]);
return c.json({
callsToday: calls?.total ?? 0,
smsToday: sms?.total ?? 0,
unheardVoicemails: vms?.total ?? 0,
activeCampaigns: campaigns?.total ?? 0,
activeNumbers: numbers?.total ?? 0,
});
});

// ═══════════════════════════════════════════════════════════════════════════════
// DB INIT
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/init-db", adminAuth, async (c) => {
const db = c.env.PBX_DB;

await db.batch([
// Core tenant table
db.prepare(`CREATE TABLE IF NOT EXISTS customers ( id TEXT PRIMARY KEY, name TEXT NOT NULL, company_name TEXT NOT NULL, email TEXT NOT NULL, api_key TEXT UNIQUE NOT NULL, status TEXT DEFAULT 'active' CHECK(status IN ('active','suspended','cancelled')), plan TEXT DEFAULT 'starter' CHECK(plan IN ('starter','professional','enterprise')), company_greeting TEXT, created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now')) )`),
// Phone numbers owned by each customer
db.prepare(`CREATE TABLE IF NOT EXISTS customer_numbers ( id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customers(id), phone_number TEXT NOT NULL, twilio_sid TEXT NOT NULL, number_type TEXT CHECK(number_type IN ('toll_free','local')), friendly_name TEXT, area_code TEXT, active INTEGER DEFAULT 1, created_at DATETIME DEFAULT (datetime('now')) )`),
// All other tables now have customer_id for tenant isolation
db.prepare(`CREATE TABLE IF NOT EXISTS extensions ( id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customers(id), name TEXT NOT NULL, number TEXT, ext TEXT NOT NULL, forward_to TEXT, email TEXT, department TEXT, active INTEGER DEFAULT 1, created_at DATETIME DEFAULT (datetime('now')), UNIQUE(customer_id, ext) )`),
db.prepare(`CREATE TABLE IF NOT EXISTS call_log ( id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id TEXT REFERENCES customers(id), from_number TEXT, to_number TEXT, direction TEXT CHECK(direction IN ('inbound','outbound')), status TEXT, duration_seconds INTEGER, twilio_sid TEXT, started_at DATETIME, ended_at DATETIME )`),
db.prepare(`CREATE TABLE IF NOT EXISTS voicemails ( id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id TEXT REFERENCES customers(id), recording_sid TEXT UNIQUE, from_number TEXT, extension TEXT, r2_key TEXT, duration_seconds INTEGER, transcription TEXT, listened INTEGER DEFAULT 0, listened_at DATETIME, created_at DATETIME )`),
db.prepare(`CREATE TABLE IF NOT EXISTS sms_log ( id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id TEXT REFERENCES customers(id), from_number TEXT, to_number TEXT, body TEXT, direction TEXT CHECK(direction IN ('inbound','outbound')), twilio_sid TEXT, created_at DATETIME )`),
db.prepare(`CREATE TABLE IF NOT EXISTS campaigns ( id TEXT PRIMARY KEY, customer_id TEXT REFERENCES customers(id), name TEXT, message TEXT, recipients TEXT, from_number TEXT, status TEXT CHECK(status IN ('pending','scheduled','sending','sent','failed')), scheduled_at INTEGER, total_recipients INTEGER DEFAULT 0, sent INTEGER DEFAULT 0, failed INTEGER DEFAULT 0, created_at DATETIME )`),
db.prepare(`CREATE TABLE IF NOT EXISTS sms_optouts ( customer_id TEXT NOT NULL REFERENCES customers(id), phone_number TEXT NOT NULL, opted_out_at DATETIME, PRIMARY KEY (customer_id, phone_number) )`),
db.prepare(`CREATE TABLE IF NOT EXISTS ai_interactions ( id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id TEXT REFERENCES customers(id), call_sid TEXT, from_number TEXT, speech_input TEXT, routing_decision TEXT, created_at DATETIME )`),
db.prepare(`CREATE TABLE IF NOT EXISTS agent_handoffs ( id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id TEXT REFERENCES customers(id), from_number TEXT, to_number TEXT, reason TEXT, resolved INTEGER DEFAULT 0, created_at DATETIME )`),
// Indexes for tenant-scoped queries
db.prepare(`CREATE INDEX IF NOT EXISTS idx_customers_api_key ON customers(api_key)`),
db.prepare(`CREATE INDEX IF NOT EXISTS idx_customer_numbers_customer ON customer_numbers(customer_id)`),
db.prepare(`CREATE INDEX IF NOT EXISTS idx_customer_numbers_phone ON customer_numbers(phone_number)`),
db.prepare(`CREATE INDEX IF NOT EXISTS idx_extensions_customer ON extensions(customer_id)`),
db.prepare(`CREATE INDEX IF NOT EXISTS idx_extensions_number ON extensions(number)`),
db.prepare(`CREATE INDEX IF NOT EXISTS idx_call_log_customer ON call_log(customer_id)`),
db.prepare(`CREATE INDEX IF NOT EXISTS idx_voicemails_customer ON voicemails(customer_id)`),
db.prepare(`CREATE INDEX IF NOT EXISTS idx_sms_log_customer ON sms_log(customer_id)`),
db.prepare(`CREATE INDEX IF NOT EXISTS idx_campaigns_customer ON campaigns(customer_id)`),
]);

return c.json({ success: true, message: "Multi-tenant database initialised." });
});

// ── Mount sub-routers ─────────────────────────────────────────────────────────

app.route("/admin", admin);
app.route("/api", api);

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface CampaignBatch {
campaignId: string;
customerId: string;
message: string;
fromNumber: string;
recipients: string[];
}

export default {
fetch: app.fetch,

async queue(batch: MessageBatch<CampaignBatch>, env: Env): Promise<void> {
const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
for (const msg of batch.messages) {
  const { campaignId, customerId, message, fromNumber, recipients } = msg.body;
  let sent = 0;
  let failed = 0;

  for (const to of recipients) {
    try {
      await twilioClient.messages.create({ from: fromNumber, to, body: message });
      sent++;

      await env.PBX_DB.prepare(
        `INSERT INTO sms_log (customer_id, from_number, to_number, body, direction, created_at)
         VALUES (?, ?, ?, ?, 'outbound', datetime('now'))`
      )
        .bind(customerId, fromNumber, to, message)
        .run();
    } catch (e) {
      console.error(`Campaign SMS failed for ${to}:`, e);
      failed++;
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  await env.PBX_DB.prepare(
    `UPDATE campaigns SET
       sent = sent + ?,
       failed = failed + ?,
       status = CASE WHEN (sent + ?) >= total_recipients THEN 'sent' ELSE 'sending' END
     WHERE id = ?`
  )
    .bind(sent, failed, sent, campaignId)
    .run();

  msg.ack();
}
},
} satisfies ExportedHandler<Env>;
