import { BizFormaRecord } from "./records";
import type { EntitlementsResponse, Env, SessionPayload } from "./types";

export { BizFormaRecord };

const TIER_RANK = { startup: 0, standard: 1, pro: 2 } as const;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(env, request);

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    try {
      const token = bearerOrCookieToken(request);
      if (!token) return withCors(Response.json({ error: "unauthorized" }, { status: 401 }), cors);

      const session = await verifySession(env, token);
      if (!session) return withCors(Response.json({ error: "unauthorized" }, { status: 401 }), cors);

      const entitlements = await fetchEntitlements(env, token);
      const hasBizformaAddon = entitlements?.addons.some(
        (a) => a.module === "bizforma_compliance" && a.status === "active"
      );
      if (!entitlements || (TIER_RANK[entitlements.accountTier] < TIER_RANK.standard && !hasBizformaAddon)) {
        return withCors(
          Response.json(
            { error: "upgrade_required", detail: "BizForma requires the Standard plan or above, or the BizForma Compliance add-on." },
            { status: 403 }
          ),
          cors
        );
      }

      const recordsId = env.RECORDS.idFromName(session.userId);
      const records = env.RECORDS.get(recordsId);

      const forwardUrl = new URL(request.url);
      const doResponse = await records.fetch(new Request(forwardUrl.toString(), request));
      return withCors(doResponse, cors);
    } catch (err) {
      console.error("bizforma worker error:", err);
      return withCors(Response.json({ error: "internal_error" }, { status: 500 }), cors);
    }
  },
} satisfies ExportedHandler<Env>;

async function verifySession(env: Env, token: string): Promise<SessionPayload | null> {
  const res = await fetch(`${env.AUTH_API_URL}/session/verify`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as SessionPayload & { valid: boolean };
  return data.valid ? data : null;
}

async function fetchEntitlements(env: Env, token: string): Promise<EntitlementsResponse | null> {
  const res = await fetch(`${env.AUTH_API_URL}/entitlements`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as EntitlementsResponse;
}

function bearerOrCookieToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);
  const cookie = request.headers.get("Cookie");
  if (!cookie) return null;
  const match = cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith("ih_session="));
  return match ? match.slice("ih_session=".length) : null;
}

function corsHeaders(env: Env, request: Request): HeadersInit {
  const origin = request.headers.get("Origin");
  const allowed = origin === env.ALLOWED_ORIGIN ? origin : env.ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

function withCors(response: Response, cors: HeadersInit): Response {
  const merged = new Headers(response.headers);
  for (const [k, v] of Object.entries(cors as Record<string, string>)) merged.set(k, v);
  return new Response(response.body, { status: response.status, headers: merged });
}
