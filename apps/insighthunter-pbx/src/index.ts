import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { DurableObject } from "cloudflare:workers";
import type { AuthUser } from "@ih/types";
import { TIER_LIMITS } from "@ih/tier-config";

interface Env {
  DB: D1Database;
  VOICEMAIL: R2Bucket;
  CALL_STATE: KVNamespace;
  CALL_SESSION: DurableObjectNamespace;
  PBX_EVENTS: AnalyticsEngineDataset;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  ASSETS: Fetcher;
}

interface IHLocals {
  user: AuthUser;
}

type TwilioForm = Record<string, string>;

function xml(body: string) {
  return new Response(body, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeUrl(url: URL) {
  url.hash = "";
  return url.toString();
}

function toTwilioUrl(request: Request) {
  const url = new URL(request.url);
  return normalizeUrl(url);
}

function parseTwilioForm(text: string): TwilioForm {
  const params = new URLSearchParams(text);
  const out: TwilioForm = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

function getHeader(req: Request, name: string) {
  return req.headers.get(name) ?? req.headers.get(name.toLowerCase());
}

async function validateTwilioRequest(request: Request, authToken: string) {
  const signature = getHeader(request, "X-Twilio-Signature");
  if (!signature) return false;

  const url = toTwilioUrl(request);
  const contentType = getHeader(request, "Content-Type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.clone().text();
    const { validateRequestWithBody } = await import("twilio");
    return validateRequestWithBody(authToken, signature, url, body);
  }

  const formText = await request.clone().text();
  const params = parseTwilioForm(formText);
  const { validateRequest } = await import("twilio");
  return validateRequest(authToken, signature, url, params);
}

// ─── Durable Object: CallSession ─────────────────────────────────────────────

export class CallSession extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/update") {
      const body = await request.json<{
        callSid: string;
        orgId: string;
        extensionId?: string;
        status: string;
      }>();

      const existing = await this.ctx.storage.get<{
        startTime?: string;
      }>("meta");

      await this.ctx.storage.put("callSid", body.callSid);
      await this.ctx.storage.put("orgId", body.orgId);
      await this.ctx.storage.put("status", body.status);
      if (!existing?.startTime) {
        await this.ctx.storage.put("startTime", new Date().toISOString());
      }
      if (body.extensionId) {
        await this.ctx.storage.put("extensionId", body.extensionId);
      }

      await this.ctx.storage.setAlarm(Date.now() + 3_600_000);
      return Response.json({ ok: true });
    }

    if (request.method === "GET") {
      const callSid = await this.ctx.storage.get<string>("callSid");
      const orgId = await this.ctx.storage.get<string>("orgId");
      const status = await this.ctx.storage.get<string>("status");
      const startTime = await this.ctx.storage.get<string>("startTime");
      const extensionId = await this.ctx.storage.get<string>("extensionId");
      return Response.json({ callSid, orgId, status, startTime, extensionId });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env; Variables: IHLocals }>();

app.use("*", secureHeaders({ xFrameOptions: "DENY", xContentTypeOptions: "nosniff" }));

app.use("*", async (c, next) => {
  const path = c.req.path;
  if (["/inbound", "/status-callback", "/voicemail-callback"].includes(path)) {
    const ok = await validateTwilioRequest(c.req.raw, c.env.TWILIO_AUTH_TOKEN);
    if (!ok) return c.json({ error: "Invalid Twilio signature", code: "BAD_SIGNATURE" }, 401);
    return next();
  }

  const raw = c.req.header("X-IH-User");
  if (!raw) return c.json({ error: "Missing user context", code: "NO_USER" }, 401);
  try {
    c.set("user", JSON.parse(raw) as AuthUser);
  } catch {
    return c.json({ error: "Invalid user context", code: "BAD_USER" }, 400);
  }
  return next();
});

// ─── Extensions ───────────────────────────────────────────────────────────────

app.get("/extensions", async (c) => {
  const user = c.get("user");
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM extensions WHERE org_id = ? ORDER BY number ASC"
  )
    .bind(user.orgId)
    .all();
  return c.json(results);
});

app.post("/extensions", async (c) => {
  const user = c.get("user");
  const tier = user.tier;
  const limit = TIER_LIMITS[tier].pbx_extensions;

  if (limit === 0) {
    return c.json(
      {
        error: "PBX not available on your plan. Requires standard or above.",
        code: "TIER_REQUIRED",
        required: "standard",
      },
      403
    );
  }

  if (limit !== null) {
    const { cnt } =
      (await c.env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM extensions WHERE org_id = ? AND is_active = 1"
      )
        .bind(user.orgId)
        .first<{ cnt: number }>()) ?? { cnt: 0 };

    if (cnt >= limit) {
      return c.json(
        {
          error: `Extension limit (${limit}) reached for your plan`,
          code: "LIMIT_REACHED",
        },
        403
      );
    }
  }

  const body = await c.req.json<{
    number: string;
    name: string;
    user_id?: string;
    voicemail_enabled?: boolean;
  }>();

  if (!body.number || !body.name) {
    return c.json({ error: "number and name required", code: "MISSING_FIELDS" }, 400);
  }

  const id = crypto.randomUUID().replace(/-/g, "");
  await c.env.DB.prepare(
    "INSERT INTO extensions (id, org_id, number, name, user_id, voicemail_enabled) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(
      id,
      user.orgId,
      body.number,
      body.name,
      body.user_id ?? null,
      body.voicemail_enabled !== false ? 1 : 0
    )
    .run();

  c.env.PBX_EVENTS.writeDataPoint({
    blobs: ["create_extension", id],
    indexes: [user.orgId],
  });

  return c.json(
    await c.env.DB.prepare("SELECT * FROM extensions WHERE id = ?").bind(id).first(),
    201
  );
});

app.patch("/extensions/:id", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<Record<string, unknown>>();
  const allowed = ["number", "name", "user_id", "voicemail_enabled", "is_active"];
  const updates: string[] = [];
  const vals: unknown[] = [];

  for (const key of allowed) {
    if (key in body) {
      updates.push(`${key} = ?`);
      vals.push(body[key]);
    }
  }

  if (!updates.length) {
    return c.json({ error: "No fields to update", code: "NO_CHANGES" }, 400);
  }

  vals.push(c.req.param("id"), user.orgId);

  await c.env.DB.prepare(
    `UPDATE extensions SET ${updates.join(", ")} WHERE id = ? AND org_id = ?`
  )
    .bind(...vals)
    .run();

  return c.json(
    await c.env.DB.prepare("SELECT * FROM extensions WHERE id = ?").bind(c.req.param("id")).first()
  );
});

app.delete("/extensions/:id", async (c) => {
  const user = c.get("user");
  await c.env.DB.prepare("DELETE FROM extensions WHERE id = ? AND org_id = ?")
    .bind(c.req.param("id"), user.orgId)
    .run();
  return c.json({ deleted: true });
});

// ─── Call Logs ────────────────────────────────────────────────────────────────

app.get("/call-logs", async (c) => {
  const user = c.get("user");
  const { direction, status, from, to, page = "1", limit = "50" } = c.req.query();
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));
  const offset = (pageNum - 1) * limitNum;

  let where = "WHERE org_id = ?";
  const params: unknown[] = [user.orgId];

  if (direction) {
    where += " AND direction = ?";
    params.push(direction);
  }
  if (status) {
    where += " AND status = ?";
    params.push(status);
  }
  if (from) {
    where += " AND created_at >= ?";
    params.push(from);
  }
  if (to) {
    where += " AND created_at <= ?";
    params.push(to);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM call_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(...params, limitNum, offset)
    .all();

  return c.json(results);
});

app.get("/call-logs/:id", async (c) => {
  const user = c.get("user");
  const row = await c.env.DB.prepare(
    "SELECT * FROM call_logs WHERE id = ? AND org_id = ?"
  )
    .bind(c.req.param("id"), user.orgId)
    .first();

  if (!row) return c.json({ error: "Call log not found", code: "NOT_FOUND" }, 404);
  return c.json(row);
});

// ─── Twilio Webhooks ─────────────────────────────────────────────────────────

app.post("/inbound", async (c) => {
  const text = await c.req.text();
  const params = new URLSearchParams(text);
  const callSid = params.get("CallSid") ?? crypto.randomUUID();
  const from = params.get("From") ?? "";
  const to = params.get("To") ?? "";

  const ext = await c.env.DB.prepare(
    "SELECT * FROM extensions WHERE number = ? AND is_active = 1 LIMIT 1"
  )
    .bind(to)
    .first<{ id: string; voicemail_enabled: number; number: string }>();

  const logId = crypto.randomUUID().replace(/-/g, "");
  await c.env.DB.prepare(
    "INSERT INTO call_logs (id, org_id, call_sid, from_number, to_number, direction, status) VALUES (?, ?, ?, ?, ?, 'inbound', 'ringing')"
  )
    .bind(logId, ext?.org_id ?? "unknown", callSid, from, to)
    .run();

  const targetNumber = ext?.number ?? to;

  const twiml = ext
    ? `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial action="/status-callback" timeout="30">
    <Number>${escapeXml(targetNumber)}</Number>
  </Dial>
  ${
    ext.voicemail_enabled
      ? '<Record action="/voicemail-callback" maxLength="120" transcribe="true"/>'
      : ""
  }
</Response>`
    : `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for calling. Please leave a message after the beep.</Say>
  <Record action="/voicemail-callback" maxLength="120" />
</Response>`;

  return xml(twiml);
});

app.post("/status-callback", async (c) => {
  const text = await c.req.text();
  const params = new URLSearchParams(text);
  const callSid = params.get("CallSid") ?? "";
  const status = params.get("CallStatus") ?? "";
  const duration = parseInt(params.get("CallDuration") ?? "0", 10);

  await c.env.DB.prepare(
    "UPDATE call_logs SET status = ?, duration_seconds = ? WHERE call_sid = ?"
  )
    .bind(status === "completed" ? "answered" : status, duration, callSid)
    .run();

  return new Response("", { status: 204 });
});

app.post("/voicemail-callback", async (c) => {
  const text = await c.req.text();
  const params = new URLSearchParams(text);
  const recordingUrl = params.get("RecordingUrl") ?? "";
  const callerNumber = params.get("From") ?? "";
  const transcription = params.get("TranscriptionText") ?? null;
  const toNumber = params.get("To") ?? "";
  const callSid = params.get("CallSid") ?? "";

  if (recordingUrl) {
    const r2Key = `voicemail/${crypto.randomUUID()}.mp3`;
    const audioRes = await fetch(`${recordingUrl}.mp3`);
    if (audioRes.ok && audioRes.body) {
      await c.env.VOICEMAIL.put(r2Key, audioRes.body, {
        httpMeta { contentType: "audio/mpeg" },
      });
    }

    const ext = await c.env.DB.prepare(
      "SELECT id, org_id FROM extensions WHERE number = ? LIMIT 1"
    )
      .bind(toNumber)
      .first<{ id: string; org_id: string }>();

    const vmId = crypto.randomUUID().replace(/-/g, "");
    await c.env.DB.prepare(
      "INSERT INTO voicemails (id, org_id, extension_id, caller_number, call_sid, r2_key, transcription) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(vmId, ext?.org_id ?? "unknown", ext?.id ?? null, callerNumber, callSid, r2Key, transcription)
      .run();
  }

  return new Response("", { status: 204 });
});

// ─── Voicemails ───────────────────────────────────────────────────────────────

app.get("/voicemails", async (c) => {
  const user = c.get("user");
  const { extension_id } = c.req.query();
  let query = "SELECT * FROM voicemails WHERE org_id = ?";
  const params: unknown[] = [user.orgId];

  if (extension_id) {
    query += " AND extension_id = ?";
    params.push(extension_id);
  }

  query += " ORDER BY created_at DESC";

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(results);
});

app.get("/voicemails/:id/audio", async (c) => {
  const user = c.get("user");
  const vm = await c.env.DB.prepare(
    "SELECT * FROM voicemails WHERE id = ? AND org_id = ?"
  )
    .bind(c.req.param("id"), user.orgId)
    .first<{ r2_key: string }>();

  if (!vm) return c.json({ error: "Voicemail not found", code: "NOT_FOUND" }, 404);

  const obj = await c.env.VOICEMAIL.get(vm.r2_key);
  if (!obj) return c.json({ error: "Audio not found", code: "STORAGE_ERROR" }, 404);

  return new Response(obj.body, { headers: { "Content-Type": "audio/mpeg" } });
});

app.patch("/voicemails/:id", async (c) => {
  const user = c.get("user");
  await c.env.DB.prepare("UPDATE voicemails SET listened = 1 WHERE id = ? AND org_id = ?")
    .bind(c.req.param("id"), user.orgId)
    .run();
  return c.json({ updated: true });
});

// ─── IVR Menus ────────────────────────────────────────────────────────────────

app.get("/ivr-menus", async (c) => {
  const user = c.get("user");
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM ivr_menus WHERE org_id = ? ORDER BY name ASC"
  )
    .bind(user.orgId)
    .all();
  return c.json(results);
});

app.post("/ivr-menus", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    name: string;
    greeting_text?: string;
    routing_config?: unknown;
  }>();

  if (!body.name) {
    return c.json({ error: "name required", code: "MISSING_FIELDS" }, 400);
  }

  const id = crypto.randomUUID().replace(/-/g, "");
  await c.env.DB.prepare(
    "INSERT INTO ivr_menus (id, org_id, name, greeting_text, routing_config) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(
      id,
      user.orgId,
      body.name,
      body.greeting_text ?? null,
      body.routing_config ? JSON.stringify(body.routing_config) : null
    )
    .run();

  return c.json(
    await c.env.DB.prepare("SELECT * FROM ivr_menus WHERE id = ?").bind(id).first(),
    201
  );
});

app.patch("/ivr-menus/:id", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    name?: string;
    greeting_text?: string;
    routing_config?: unknown;
  }>();

  const updates: string[] = [];
  const vals: unknown[] = [];

  if (body.name) {
    updates.push("name = ?");
    vals.push(body.name);
  }
  if (body.greeting_text !== undefined) {
    updates.push("greeting_text = ?");
    vals.push(body.greeting_text);
  }
  if (body.routing_config !== undefined) {
    updates.push("routing_config = ?");
    vals.push(JSON.stringify(body.routing_config));
  }

  if (!updates.length) {
    return c.json({ error: "No fields to update", code: "NO_CHANGES" }, 400);
  }

  vals.push(c.req.param("id"), user.orgId);

  await c.env.DB.prepare(
    `UPDATE ivr_menus SET ${updates.join(", ")} WHERE id = ? AND org_id = ?`
  )
    .bind(...vals)
    .run();

  return c.json(
    await c.env.DB.prepare("SELECT * FROM ivr_menus WHERE id = ?").bind(c.req.param("id")).first()
  );
});

app.delete("/ivr-menus/:id", async (c) => {
  const user = c.get("user");
  await c.env.DB.prepare("DELETE FROM ivr_menus WHERE id = ? AND org_id = ?")
    .bind(c.req.param("id"), user.orgId)
    .run();
  return c.json({ deleted: true });
});

app.get("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
