/**

- CloudPBX - Enterprise Business Phone System
- Built on Cloudflare Workers + Twilio
- 
- AI powered by Workers AI (@cf/meta/llama-3.1-8b-instruct)
- No external AI API keys required — billed through your Cloudflare account.
- 
- Features:
- - Toll-free + local numbers per extension
- - AI Receptionist (Workers AI — speech → intent → routing)
- - IVR/PBX call routing
- - Voicemail stored in R2 with AI transcription
- - Mass SMS campaigns (Queues, TCPA-compliant)
- - Individual AI-powered SMS conversations
    */

import { Hono } from “hono”;
import { cors } from “hono/cors”;
import twilio from “twilio”;

// ─── Types ───────────────────────────────────────────────────────────────────

/** Workers AI chat message shape for text-generation models. */
interface AiMessage {
role: “system” | “user” | “assistant”;
content: string;
}

/** Workers AI response from env.AI.run() for text-generation models. */
interface AiTextResponse {
response?: string;
}

export interface Env {
// ── Cloudflare Bindings ──────────────────────────────────────────────────
VOICEMAIL_BUCKET: R2Bucket;
RECORDINGS_BUCKET: R2Bucket;
PBX_DB: D1Database;
SMS_CONVERSATIONS: KVNamespace;
CAMPAIGN_QUEUE: Queue;

/**

- Workers AI binding — configured via [ai] in wrangler.jsonc.
- No API key needed; usage is billed through your Cloudflare account.
  */
  AI: Ai;

// ── Twilio secrets (wrangler secret put <NAME>) ───────────────────────────
TWILIO_ACCOUNT_SID: string;
TWILIO_AUTH_TOKEN: string;
TWILIO_TOLL_FREE_NUMBER: string;

// ── App config (wrangler.jsonc [vars]) ────────────────────────────────────
BASE_URL: string;
COMPANY_NAME: string;
COMPANY_GREETING: string;

/**

- Workers AI model for receptionist + SMS assistant.
- Defaults to @cf/meta/llama-3.1-8b-instruct if not set.
- 
- Other options:
- @cf/meta/llama-3.3-70b-instruct-fp8-fast  — higher quality, slightly slower
- @cf/mistral/mistral-7b-instruct-v0.1        — alternative 7B
  */
  AI_MODEL: string;
  }

interface Extension {
id: string;
name: string;
number: string;      // Twilio local DID
ext: string;         // e.g. “101”
forward_to?: string; // external phone number (DB column)
forwardTo?: string;  // alias used in JSON API bodies
email: string;
department: string;
active: boolean | number;
}

interface SMSConversation {
from: string;
messages: Array<{ role: “user” | “assistant”; content: string; ts: number }>;
lastActive: number;
type: “ai” | “human”;
assignedExt?: string;
}

interface RoutingDecision {
action: “transfer” | “voicemail” | “info” | “goodbye”;
ext: string;
message: string;
reason: string;
}

// ─── Workers AI Helper ────────────────────────────────────────────────────────

/**

- Wrapper around env.AI.run() for chat-style text generation.
- Returns the model’s text response, or `fallback` on any error.
- Using a fallback ensures IVR call flows never break due to an AI hiccup.
  */
  async function aiChat(
  ai: Ai,
  model: string,
  messages: AiMessage[],
  fallback = “”
  ): Promise<string> {
  try {
  const result = (await ai.run(model as Parameters<Ai[“run”]>[0], {
  messages,
  max_tokens: 512,
  })) as AiTextResponse;
  
  return result?.response?.trim() ?? fallback;
  } catch (err) {
  console.error(“Workers AI error:”, err);
  return fallback;
  }
  }

/**

- Extracts the first JSON object `{...}` from a string.
- LLMs occasionally wrap JSON in markdown fences or prose — this strips that.
  */
  function extractJson(text: string): string {
  const match = text.match(/{[\s\S]*}/);
  return match ? match[0] : text;
  }

// ─── App Setup ───────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env }>();
app.use(”*”, cors({ origin: “*” }));

// ─── TwiML Helpers ───────────────────────────────────────────────────────────

function twimlResponse(xml: string): Response {
return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${xml}`, {
headers: { “Content-Type”: “text/xml” },
});
}

function buildMainGreeting(env: Env, extensions: Extension[]): string {
const extMenu = extensions
.filter((e) => e.active)
.map((e) => `<Say>Press ${e.ext} for ${e.name} in ${e.department}.</Say>`)
.join(”\n”);

return `<Response> <Gather numDigits="3" action="${env.BASE_URL}/ivr/route" timeout="8" finishOnKey=""> <Say voice="Polly.Joanna-Neural"> Thank you for calling ${env.COMPANY_NAME}. ${env.COMPANY_GREETING} For our AI receptionist, press 0. ${extMenu} To repeat this menu, press 9. </Say> </Gather> <Redirect>${env.BASE_URL}/ivr/inbound</Redirect> </Response>`;
}

// ─── IVR / Call Routing ──────────────────────────────────────────────────────

// Entry point for all inbound calls (toll-free and local DIDs)
app.post(”/ivr/inbound”, async (c) => {
const env = c.env;
const form = await c.req.formData();
const to = form.get(“To”) as string;
const from = form.get(“From”) as string;

console.log(`Inbound call: ${from} → ${to}`);

await env.PBX_DB.prepare(
`INSERT INTO call_log (from_number, to_number, direction, status, started_at) VALUES (?, ?, 'inbound', 'ringing', datetime('now'))`
)
.bind(from, to)
.run();

// Check if caller dialed a direct local DID (not the main toll-free)
const ext = await env.PBX_DB.prepare(
`SELECT * FROM extensions WHERE number = ? AND active = 1`
)
.bind(to)
.first<Extension>();

if (ext && to !== env.TWILIO_TOLL_FREE_NUMBER) {
return twimlResponse(`<Response> <Say voice="Polly.Joanna-Neural">Please hold while we connect your call.</Say> <Dial timeout="20" action="${env.BASE_URL}/ivr/voicemail?ext=${ext.ext}"> ${ext.forward_to ? `<Number>${ext.forward_to}</Number>` : ""} <Client>${ext.id}</Client> </Dial> </Response>`);
}

// Toll-free → show main IVR menu
const extensions = await env.PBX_DB.prepare(
`SELECT * FROM extensions WHERE active = 1 ORDER BY ext`
).all<Extension>();

return twimlResponse(buildMainGreeting(env, extensions.results));
});

// Digit-based IVR routing handler
app.post(”/ivr/route”, async (c) => {
const env = c.env;
const form = await c.req.formData();
const digits = form.get(“Digits”) as string;

if (digits === “0”) {
// Hand off to speech-based AI receptionist
return twimlResponse(`<Response> <Say voice="Polly.Joanna-Neural"> Connecting you to our AI receptionist now. </Say> <Gather input="speech" action="${env.BASE_URL}/ivr/ai-receptionist" speechTimeout="auto" language="en-US" timeout="6"> <Say voice="Polly.Joanna-Neural">How can I help you today?</Say> </Gather> <Redirect>${env.BASE_URL}/ivr/inbound</Redirect> </Response>`);
}

if (digits === “9”) {
return twimlResponse(`<Response> <Redirect>${env.BASE_URL}/ivr/inbound</Redirect> </Response>`);
}

const ext = await env.PBX_DB.prepare(
`SELECT * FROM extensions WHERE ext = ? AND active = 1`
)
.bind(digits)
.first<Extension>();

if (!ext) {
return twimlResponse(`<Response> <Say voice="Polly.Joanna-Neural"> I'm sorry, that extension was not found. Returning you to the main menu. </Say> <Redirect>${env.BASE_URL}/ivr/inbound</Redirect> </Response>`);
}

return twimlResponse(`<Response> <Say voice="Polly.Joanna-Neural"> Connecting you to ${ext.name} in ${ext.department}. Please hold. </Say> <Dial timeout="25" action="${env.BASE_URL}/ivr/voicemail?ext=${ext.ext}&name=${encodeURIComponent(ext.name)}"> ${ext.forward_to ? `<Number>${ext.forward_to}</Number>` : ""} <Client>${ext.id}</Client> </Dial> </Response>`);
});

/**

- AI Receptionist
- 
- Receives Twilio’s speech-to-text transcription, feeds it to Workers AI,
- and acts on the structured JSON routing decision the model returns.
- 
- Model used: env.AI_MODEL (default: @cf/meta/llama-3.1-8b-instruct)
- No external API key required.
  */
  app.post(”/ivr/ai-receptionist”, async (c) => {
  const env = c.env;
  const form = await c.req.formData();
  const speechResult = form.get(“SpeechResult”) as string;
  const from = form.get(“From”) as string;
  const callSid = form.get(“CallSid”) as string;
  const model = env.AI_MODEL || “@cf/meta/llama-3.1-8b-instruct”;

if (!speechResult) {
return twimlResponse(`<Response> <Gather input="speech" action="${env.BASE_URL}/ivr/ai-receptionist" speechTimeout="auto" language="en-US" timeout="6"> <Say voice="Polly.Joanna-Neural">I didn't catch that. How can I help you?</Say> </Gather> <Redirect>${env.BASE_URL}/ivr/inbound</Redirect> </Response>`);
}

// Fetch active extensions to give the model routing context
const extensions = await env.PBX_DB.prepare(
`SELECT * FROM extensions WHERE active = 1`
).all<Extension>();

const extList = extensions.results
.map((e) => `- Extension ${e.ext}: ${e.name} (${e.department})`)
.join(”\n”);

// Ask Workers AI for a structured routing decision
const rawResponse = await aiChat(
env.AI,
model,
[
{
role: “system”,
content: `You are an AI phone receptionist for ${env.COMPANY_NAME}.
Analyze the caller’s speech and return ONLY a JSON routing decision — no prose, no markdown.

Available extensions:
${extList}

Required JSON format:
{
“action”: “transfer” | “voicemail” | “info” | “goodbye”,
“ext”: “101”,
“message”: “Short natural sentence to speak aloud to the caller.”,
“reason”: “Internal routing rationale.”
}

Rules:

- “transfer”: caller wants to speak with someone — pick the best matching extension.
- “voicemail”: caller wants to leave a message — pick the most relevant extension.
- “info”: caller has a general question — answer concisely in the message field.
- “goodbye”: caller is done — say a warm farewell.
- “message” will be read by TTS, so keep it conversational and under 2 sentences.
- If no extension matches, use “info” and offer further assistance.`, }, { role: "user", content: `Caller said: “${speechResult}”`,
  },
  ],
  // Safe JSON fallback if Workers AI is temporarily unavailable
  JSON.stringify({
  action: “info”,
  ext: “”,
  message:
  “I’m sorry, I had trouble understanding that. Let me connect you with someone who can help.”,
  reason: “AI fallback”,
  })
  );
  
  // Parse — extractJson handles cases where the model wraps JSON in text/fences
  let routing: RoutingDecision = {
  action: “info”,
  ext: “”,
  message: “Let me connect you with the right person.”,
  reason: “”,
  };
  
  try {
  routing = JSON.parse(extractJson(rawResponse));
  } catch (e) {
  console.error(“Failed to parse Workers AI routing JSON:”, rawResponse);
  }
  
  // Log AI interaction for admin review
  await env.PBX_DB.prepare(
  `INSERT INTO ai_interactions (call_sid, from_number, speech_input, routing_decision, created_at) VALUES (?, ?, ?, ?, datetime('now'))`
  )
  .bind(callSid, from, speechResult, JSON.stringify(routing))
  .run();
  
  // Act on the routing decision
  if (routing.action === “transfer” && routing.ext) {
  const targetExt = extensions.results.find((e) => e.ext === routing.ext);
  return twimlResponse(`<Response> <Say voice="Polly.Joanna-Neural">${routing.message}</Say> <Dial timeout="25" action="${env.BASE_URL}/ivr/voicemail?ext=${routing.ext}"> ${targetExt?.forward_to ? `<Number>${targetExt.forward_to}</Number>` : ""} <Client>${targetExt?.id ?? routing.ext}</Client> </Dial> </Response>`);
  }
  
  if (routing.action === “voicemail” && routing.ext) {
  return twimlResponse(`<Response> <Say voice="Polly.Joanna-Neural">${routing.message}</Say> <Redirect>${env.BASE_URL}/ivr/voicemail?ext=${routing.ext}</Redirect> </Response>`);
  }
  
  if (routing.action === “goodbye”) {
  return twimlResponse(`<Response> <Say voice="Polly.Joanna-Neural">${routing.message}</Say> <Hangup/> </Response>`);
  }
  
  // “info” — speak the answer and offer another question
  return twimlResponse(`<Response> <Say voice="Polly.Joanna-Neural">${routing.message}</Say> <Gather input="speech" action="${env.BASE_URL}/ivr/ai-receptionist" speechTimeout="auto" language="en-US" timeout="6"> <Say voice="Polly.Joanna-Neural">Is there anything else I can help you with?</Say> </Gather> <Redirect>${env.BASE_URL}/ivr/inbound</Redirect> </Response>`);
  });

// ─── Voicemail ────────────────────────────────────────────────────────────────

// Called by Twilio’s <Dial action="..."> when a call goes unanswered
app.post(”/ivr/voicemail”, async (c) => {
const env = c.env;
const form = await c.req.formData();
const dialCallStatus = form.get(“DialCallStatus”) as string;
const ext = c.req.query(“ext”) || “general”;
const name = c.req.query(“name”) || “our team”;

if (dialCallStatus === “completed”) {
return twimlResponse(`<Response></Response>`);
}

return twimlResponse(`<Response> <Say voice="Polly.Joanna-Neural"> I'm sorry, ${name} is unavailable right now. Please leave a message after the tone and we will return your call as soon as possible. You may also hang up and send a text message to this number for a faster response. </Say> <Record maxLength="120" action="${env.BASE_URL}/ivr/voicemail-save?ext=${ext}" transcribe="true" transcribeCallback="${env.BASE_URL}/ivr/transcription" playBeep="true" /> <Say voice="Polly.Joanna-Neural">We did not receive a recording. Goodbye.</Say> </Response>`);
});

// Fetch the recording from Twilio and persist to R2
app.post(”/ivr/voicemail-save”, async (c) => {
const env = c.env;
const form = await c.req.formData();
const recordingUrl = form.get(“RecordingUrl”) as string;
const recordingSid = form.get(“RecordingSid”) as string;
const from = form.get(“From”) as string;
const duration = (form.get(“RecordingDuration”) as string) ?? “0”;
const ext = c.req.query(“ext”) || “general”;

if (recordingUrl) {
const audioResp = await fetch(`${recordingUrl}.mp3`, {
headers: {
Authorization:
“Basic “ +
btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`),
},
});

```
if (audioResp.ok) {
  const key = `voicemail/${ext}/${recordingSid}.mp3`;
  await env.VOICEMAIL_BUCKET.put(key, audioResp.body, {
    httpMetadata: { contentType: "audio/mpeg" },
    customMetadata: { from, duration, ext, recordingSid },
  });

  await env.PBX_DB.prepare(
    `INSERT INTO voicemails (recording_sid, from_number, extension, r2_key, duration_seconds, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`
  )
    .bind(recordingSid, from, ext, key, parseInt(duration))
    .run();
}
```

}

return twimlResponse(`<Response> <Say voice="Polly.Joanna-Neural"> Your message has been recorded. Thank you for calling ${env.COMPANY_NAME}. Goodbye. </Say> <Hangup/> </Response>`);
});

// Twilio transcription webhook — saves transcript to D1
app.post(”/ivr/transcription”, async (c) => {
const form = await c.req.formData();
const transcriptionText = form.get(“TranscriptionText”) as string;
const recordingSid = form.get(“RecordingSid”) as string;

if (transcriptionText && recordingSid) {
await c.env.PBX_DB.prepare(
`UPDATE voicemails SET transcription = ? WHERE recording_sid = ?`
)
.bind(transcriptionText, recordingSid)
.run();
}

return new Response(“OK”);
});

// ─── Inbound SMS ──────────────────────────────────────────────────────────────

/**

- Handles inbound SMS messages.
- 
- Flow:
- 1. STOP/UNSUBSCRIBE → opt-out and confirm.
- 1. START → opt back in.
- 1. “human/agent” keywords → flag for human handoff.
- 1. Thread type === “human” → silently skip (agent handles it).
- 1. Default → Workers AI generates a contextual reply.
   */
   app.post(”/sms/inbound”, async (c) => {
   const env = c.env;
   const form = await c.req.formData();
   const from = form.get(“From”) as string;
   const to = form.get(“To”) as string;
   const body = form.get(“Body”) as string;
   const model = env.AI_MODEL || “@cf/meta/llama-3.1-8b-instruct”;

console.log(`Inbound SMS: ${from} → ${to}: ${body}`);

await env.PBX_DB.prepare(
`INSERT INTO sms_log (from_number, to_number, body, direction, created_at) VALUES (?, ?, ?, 'inbound', datetime('now'))`
)
.bind(from, to, body)
.run();

const lowerBody = body.trim().toLowerCase();

// TCPA mandatory opt-out handling
if ([“stop”, “unsubscribe”, “quit”, “cancel”, “end”].includes(lowerBody)) {
await env.PBX_DB.prepare(
`INSERT INTO sms_optouts (phone_number, opted_out_at) VALUES (?, datetime('now')) ON CONFLICT(phone_number) DO UPDATE SET opted_out_at = datetime('now')`
)
.bind(from)
.run();

```
const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
await client.messages.create({
  from: to,
  to: from,
  body: `You have been unsubscribed from ${env.COMPANY_NAME} messages. Reply START to resubscribe.`,
});
return new Response("OK");
```

}

// TCPA opt-in
if (lowerBody === “start”) {
await env.PBX_DB.prepare(
`DELETE FROM sms_optouts WHERE phone_number = ?`
)
.bind(from)
.run();
const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
await client.messages.create({
from: to,
to: from,
body: `Welcome back! You've been re-subscribed to ${env.COMPANY_NAME} messages.`,
});
return new Response(“OK”);
}

// Load or create conversation state from KV
const convKey = `conv:${from}:${to}`;
const existingConv = await env.SMS_CONVERSATIONS.get(convKey);
let conversation: SMSConversation = existingConv
? JSON.parse(existingConv)
: { from, messages: [], lastActive: Date.now(), type: “ai” };

// Human-handoff request
if (
[“human”, “agent”, “representative”, “person”, “operator”].some((w) =>
lowerBody.includes(w)
)
) {
conversation.type = “human”;
await env.SMS_CONVERSATIONS.put(convKey, JSON.stringify(conversation), {
expirationTtl: 86400 * 7,
});

```
const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
await client.messages.create({
  from: to,
  to: from,
  body: `Got it! I'm flagging this conversation for a team member. We'll follow up shortly during business hours (Mon–Fri, 9am–6pm).`,
});

await env.PBX_DB.prepare(
  `INSERT INTO agent_handoffs (from_number, to_number, reason, created_at)
   VALUES (?, ?, 'customer_request', datetime('now'))`
)
  .bind(from, to)
  .run();

return new Response("OK");
```

}

// If a human agent has taken over this thread, don’t auto-reply
if (conversation.type === “human”) {
return new Response(“OK”);
}

// ── Workers AI SMS Reply ───────────────────────────────────────────────────

conversation.messages.push({ role: “user”, content: body, ts: Date.now() });

// Build message history for the model (last 10 turns to keep context window manageable)
const aiMessages: AiMessage[] = [
{
role: “system”,
content: `You are a friendly SMS assistant for ${env.COMPANY_NAME}. ${env.COMPANY_GREETING}

Guidelines:

- Keep replies concise — ideally under 160 characters, never more than 3 SMS segments (480 chars total).
- Be warm, professional, and to the point.
- If a question is too complex for SMS, offer to have a human follow up.
- Do not fabricate information; if you don’t know, say so and offer a follow-up.
- Do not reveal that you are an AI unless directly asked.`,
  },
  …conversation.messages.slice(-10).map((m) => ({
  role: m.role as “user” | “assistant”,
  content: m.content,
  })),
  ];
  
  const replyText = await aiChat(
  env.AI,
  model,
  aiMessages,
  “Thanks for your message! A team member will follow up with you shortly.”
  );
  
  // Persist reply in conversation thread
  conversation.messages.push({ role: “assistant”, content: replyText, ts: Date.now() });
  conversation.lastActive = Date.now();
  
  await env.SMS_CONVERSATIONS.put(convKey, JSON.stringify(conversation), {
  expirationTtl: 86400 * 7,
  });
  
  // Send via Twilio
  const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  await client.messages.create({ from: to, to: from, body: replyText });
  
  await env.PBX_DB.prepare(
  `INSERT INTO sms_log (from_number, to_number, body, direction, created_at) VALUES (?, ?, ?, 'outbound', datetime('now'))`
  )
  .bind(to, from, replyText)
  .run();
  
  return new Response(“OK”);
  });

// ─── SMS Campaign API ─────────────────────────────────────────────────────────

app.post(”/api/campaigns”, async (c) => {
const env = c.env;
const body = await c.req.json<{
name: string;
message: string;
recipients: string[];
scheduledAt?: number;
fromNumber?: string;
}>();

if (!body.name || !body.message || !body.recipients?.length) {
return c.json({ error: “name, message, and recipients are required” }, 400);
}

const campaignId = crypto.randomUUID();

// Filter opted-out numbers before queueing
const optouts = await env.PBX_DB.prepare(
`SELECT phone_number FROM sms_optouts`
).all<{ phone_number: string }>();
const optoutSet = new Set(optouts.results.map((o) => o.phone_number));
const filteredRecipients = body.recipients.filter((r) => !optoutSet.has(r));

await env.PBX_DB.prepare(
`INSERT INTO campaigns (id, name, message, recipients, from_number, status, scheduled_at, total_recipients, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
)
.bind(
campaignId,
body.name,
body.message,
JSON.stringify(filteredRecipients),
body.fromNumber ?? env.TWILIO_TOLL_FREE_NUMBER,
body.scheduledAt ? “scheduled” : “pending”,
body.scheduledAt ?? null,
filteredRecipients.length
)
.run();

if (!body.scheduledAt) {
// Queue in batches of 10 (Queue message size limits)
const batchSize = 10;
for (let i = 0; i < filteredRecipients.length; i += batchSize) {
await env.CAMPAIGN_QUEUE.send({
campaignId,
message: body.message,
fromNumber: body.fromNumber ?? env.TWILIO_TOLL_FREE_NUMBER,
recipients: filteredRecipients.slice(i, i + batchSize),
});
}
await env.PBX_DB.prepare(
`UPDATE campaigns SET status = 'sending' WHERE id = ?`
)
.bind(campaignId)
.run();
}

return c.json({
success: true,
campaignId,
filteredCount: filteredRecipients.length,
optoutCount: body.recipients.length - filteredRecipients.length,
});
});

app.get(”/api/campaigns”, async (c) => {
const campaigns = await c.env.PBX_DB.prepare(
`SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 50`
).all();
return c.json(campaigns.results);
});

app.post(”/api/sms/send”, async (c) => {
const env = c.env;
const body = await c.req.json<{ to: string; message: string; from?: string }>();
const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

const msg = await client.messages.create({
from: body.from ?? env.TWILIO_TOLL_FREE_NUMBER,
to: body.to,
body: body.message,
});

await env.PBX_DB.prepare(
`INSERT INTO sms_log (from_number, to_number, body, direction, twilio_sid, created_at) VALUES (?, ?, ?, 'outbound', ?, datetime('now'))`
)
.bind(body.from ?? env.TWILIO_TOLL_FREE_NUMBER, body.to, body.message, msg.sid)
.run();

return c.json({ success: true, sid: msg.sid });
});

// ─── Extensions API ───────────────────────────────────────────────────────────

app.get(”/api/extensions”, async (c) => {
const exts = await c.env.PBX_DB.prepare(
`SELECT * FROM extensions ORDER BY ext`
).all();
return c.json(exts.results);
});

app.post(”/api/extensions”, async (c) => {
const env = c.env;
const body = await c.req.json<Omit<Extension, “id”>>();
const id = crypto.randomUUID();
let localNumber = body.number ?? “”;

// Auto-provision a Twilio local DID for this extension
try {
const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
const areaCode =
body.number?.replace(/\D/g, “”).slice(1, 4) || “800”;
const available = await client.availablePhoneNumbers(“US”).local.list({
areaCode: parseInt(areaCode),
limit: 1,
});

```
if (available.length > 0) {
  const purchased = await client.incomingPhoneNumbers.create({
    phoneNumber: available[0].phoneNumber,
    voiceUrl: `${env.BASE_URL}/ivr/inbound`,
    smsUrl: `${env.BASE_URL}/sms/inbound`,
    friendlyName: `Ext ${body.ext} - ${body.name}`,
  });
  localNumber = purchased.phoneNumber;
}
```

} catch (e) {
console.error(“Twilio number provisioning failed:”, e);
}

await env.PBX_DB.prepare(
`INSERT INTO extensions (id, name, number, ext, forward_to, email, department, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
)
.bind(
id,
body.name,
localNumber,
body.ext,
body.forwardTo ?? body.forward_to ?? null,
body.email,
body.department
)
.run();

return c.json({ success: true, id, localNumber });
});

app.put(”/api/extensions/:id”, async (c) => {
const body = await c.req.json<Partial<Extension>>();
await c.env.PBX_DB.prepare(
`UPDATE extensions SET name = COALESCE(?, name), forward_to = COALESCE(?, forward_to), department = COALESCE(?, department), active = COALESCE(?, active) WHERE id = ?`
)
.bind(
body.name ?? null,
body.forwardTo ?? body.forward_to ?? null,
body.department ?? null,
body.active !== undefined ? (body.active ? 1 : 0) : null,
c.req.param(“id”)
)
.run();
return c.json({ success: true });
});

app.delete(”/api/extensions/:id”, async (c) => {
await c.env.PBX_DB.prepare(
`UPDATE extensions SET active = 0 WHERE id = ?`
)
.bind(c.req.param(“id”))
.run();
return c.json({ success: true });
});

// ─── Voicemail API ────────────────────────────────────────────────────────────

app.get(”/api/voicemails”, async (c) => {
const ext = c.req.query(“ext”);
const result = ext
? await c.env.PBX_DB.prepare(
`SELECT * FROM voicemails WHERE extension = ? ORDER BY created_at DESC LIMIT 50`
)
.bind(ext)
.all()
: await c.env.PBX_DB.prepare(
`SELECT * FROM voicemails ORDER BY created_at DESC LIMIT 50`
).all();
return c.json(result.results);
});

app.get(”/api/voicemails/:id/audio”, async (c) => {
const vm = await c.env.PBX_DB.prepare(
`SELECT r2_key FROM voicemails WHERE id = ?`
)
.bind(c.req.param(“id”))
.first<{ r2_key: string }>();

if (!vm) return c.json({ error: “Not found” }, 404);

const obj = await c.env.VOICEMAIL_BUCKET.get(vm.r2_key);
if (!obj) return c.json({ error: “Audio not found in storage” }, 404);

return new Response(obj.body, { headers: { “Content-Type”: “audio/mpeg” } });
});

app.post(”/api/voicemails/:id/listen”, async (c) => {
await c.env.PBX_DB.prepare(
`UPDATE voicemails SET listened = 1, listened_at = datetime('now') WHERE id = ?`
)
.bind(c.req.param(“id”))
.run();
return c.json({ success: true });
});

// ─── Analytics & Dashboard ────────────────────────────────────────────────────

app.get(”/api/analytics/calls”, async (c) => {
const period = c.req.query(“period”) || “7d”;
const days = period === “30d” ? 30 : period === “90d” ? 90 : 7;

const stats = await c.env.PBX_DB.prepare(`SELECT date(started_at) as date, COUNT(*) as total, SUM(CASE WHEN direction='inbound' THEN 1 ELSE 0 END) as inbound, SUM(CASE WHEN direction='outbound' THEN 1 ELSE 0 END) as outbound, AVG(duration_seconds) as avg_duration FROM call_log WHERE started_at >= datetime('now', '-${days} days') GROUP BY date(started_at) ORDER BY date`).all();

return c.json(stats.results);
});

app.get(”/api/analytics/sms”, async (c) => {
const stats = await c.env.PBX_DB.prepare(`SELECT date(created_at) as date, COUNT(*) as total, SUM(CASE WHEN direction='inbound' THEN 1 ELSE 0 END) as inbound, SUM(CASE WHEN direction='outbound' THEN 1 ELSE 0 END) as outbound FROM sms_log WHERE created_at >= datetime('now', '-7 days') GROUP BY date(created_at) ORDER BY date`).all();
return c.json(stats.results);
});

app.get(”/api/dashboard”, async (c) => {
const [calls, sms, voicemails, campaigns] = await Promise.all([
c.env.PBX_DB.prepare(
`SELECT COUNT(*) as total FROM call_log WHERE started_at >= datetime('now', '-1 day')`
).first<{ total: number }>(),
c.env.PBX_DB.prepare(
`SELECT COUNT(*) as total FROM sms_log WHERE created_at >= datetime('now', '-1 day')`
).first<{ total: number }>(),
c.env.PBX_DB.prepare(
`SELECT COUNT(*) as total FROM voicemails WHERE listened = 0`
).first<{ total: number }>(),
c.env.PBX_DB.prepare(
`SELECT COUNT(*) as total FROM campaigns WHERE status = 'sending'`
).first<{ total: number }>(),
]);

return c.json({
callsToday: calls?.total ?? 0,
smsToday: sms?.total ?? 0,
unheardVoicemails: voicemails?.total ?? 0,
activeCampaigns: campaigns?.total ?? 0,
});
});

// ─── SMS Conversations API ────────────────────────────────────────────────────

app.get(”/api/conversations”, async (c) => {
const list = await c.env.SMS_CONVERSATIONS.list({ prefix: “conv:” });
const conversations = await Promise.all(
list.keys.slice(0, 50).map(async (k) => {
const val = await c.env.SMS_CONVERSATIONS.get(k.name);
return val ? JSON.parse(val) : null;
})
);
return c.json(conversations.filter(Boolean));
});

app.get(”/api/conversations/:from/:to”, async (c) => {
const key = `conv:${c.req.param("from")}:${c.req.param("to")}`;
const conv = await c.env.SMS_CONVERSATIONS.get(key);
return c.json(conv ? JSON.parse(conv) : null);
});

// Human agent manual reply
app.post(”/api/conversations/reply”, async (c) => {
const env = c.env;
const body = await c.req.json<{ from: string; to: string; message: string }>();

const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
await client.messages.create({ from: body.to, to: body.from, body: body.message });

const key = `conv:${body.from}:${body.to}`;
const existing = await env.SMS_CONVERSATIONS.get(key);
if (existing) {
const conv: SMSConversation = JSON.parse(existing);
conv.messages.push({ role: “assistant”, content: body.message, ts: Date.now() });
conv.lastActive = Date.now();
await env.SMS_CONVERSATIONS.put(key, JSON.stringify(conv), {
expirationTtl: 86400 * 7,
});
}

await env.PBX_DB.prepare(
`INSERT INTO sms_log (from_number, to_number, body, direction, created_at) VALUES (?, ?, ?, 'outbound', datetime('now'))`
)
.bind(body.to, body.from, body.message)
.run();

return c.json({ success: true });
});

// ─── Database Initialization ──────────────────────────────────────────────────

app.post(”/api/init-db”, async (c) => {
const db = c.env.PBX_DB;

await db.batch([
db.prepare(`CREATE TABLE IF NOT EXISTS extensions ( id TEXT PRIMARY KEY, name TEXT NOT NULL, number TEXT, ext TEXT UNIQUE NOT NULL, forward_to TEXT, email TEXT, department TEXT, active INTEGER DEFAULT 1, created_at DATETIME DEFAULT (datetime('now')) )`),
db.prepare(`CREATE TABLE IF NOT EXISTS call_log ( id INTEGER PRIMARY KEY AUTOINCREMENT, from_number TEXT, to_number TEXT, direction TEXT, status TEXT, duration_seconds INTEGER, twilio_sid TEXT, started_at DATETIME, ended_at DATETIME )`),
db.prepare(`CREATE TABLE IF NOT EXISTS voicemails ( id INTEGER PRIMARY KEY AUTOINCREMENT, recording_sid TEXT UNIQUE, from_number TEXT, extension TEXT, r2_key TEXT, duration_seconds INTEGER, transcription TEXT, listened INTEGER DEFAULT 0, listened_at DATETIME, created_at DATETIME )`),
db.prepare(`CREATE TABLE IF NOT EXISTS sms_log ( id INTEGER PRIMARY KEY AUTOINCREMENT, from_number TEXT, to_number TEXT, body TEXT, direction TEXT, twilio_sid TEXT, created_at DATETIME )`),
db.prepare(`CREATE TABLE IF NOT EXISTS campaigns ( id TEXT PRIMARY KEY, name TEXT, message TEXT, recipients TEXT, from_number TEXT, status TEXT, scheduled_at INTEGER, total_recipients INTEGER DEFAULT 0, sent INTEGER DEFAULT 0, failed INTEGER DEFAULT 0, created_at DATETIME )`),
db.prepare(`CREATE TABLE IF NOT EXISTS sms_optouts ( phone_number TEXT PRIMARY KEY, opted_out_at DATETIME )`),
db.prepare(`CREATE TABLE IF NOT EXISTS ai_interactions ( id INTEGER PRIMARY KEY AUTOINCREMENT, call_sid TEXT, from_number TEXT, speech_input TEXT, routing_decision TEXT, created_at DATETIME )`),
db.prepare(`CREATE TABLE IF NOT EXISTS agent_handoffs ( id INTEGER PRIMARY KEY AUTOINCREMENT, from_number TEXT, to_number TEXT, reason TEXT, resolved INTEGER DEFAULT 0, created_at DATETIME )`),
]);

return c.json({ success: true, message: “Database initialized successfully.” });
});

// ─── Exports ──────────────────────────────────────────────────────────────────

export interface CampaignBatch {
campaignId: string;
message: string;
fromNumber: string;
recipients: string[];
}

export default {
fetch: app.fetch,

// Queue consumer — drains campaign SMS batches at ~1 msg/sec (Twilio rate limit)
async queue(batch: MessageBatch<CampaignBatch>, env: Env): Promise<void> {
const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

```
for (const msg of batch.messages) {
  const { campaignId, message, fromNumber, recipients } = msg.body;
  let sent = 0;
  let failed = 0;

  for (const to of recipients) {
    try {
      await client.messages.create({ from: fromNumber, to, body: message });
      sent++;

      await env.PBX_DB.prepare(
        `INSERT INTO sms_log (from_number, to_number, body, direction, created_at)
         VALUES (?, ?, ?, 'outbound', datetime('now'))`
      )
        .bind(fromNumber, to, message)
        .run();
    } catch (e) {
      console.error(`Campaign SMS failed for ${to}:`, e);
      failed++;
    }

    // Respect Twilio's ~1 msg/sec rate limit for toll-free numbers
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
```

},
} satisfies ExportedHandler<Env>;