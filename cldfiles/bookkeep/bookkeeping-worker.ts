import { suggestCategory } from "./categorize";
import { BookkeepingLedger } from "./ledger";
import type { Env, SessionPayload } from "./types";

export { BookkeepingLedger };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(env, request);

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    try {
      const session = await requireSession(request, env);
      if (!session) return withCors(Response.json({ error: "unauthorized" }, { status: 401 }), cors);

      // Startup tier and above all include bookkeeping — no entitlement gate
      // needed beyond a valid session. (Modules gated to standard/pro should
      // call GET {AUTH_API_URL}/entitlements and check accountTier/addons
      // the same way insighthunter-dashboard does.)

      const ledgerId = env.LEDGER.idFromName(session.userId);
      const ledger = env.LEDGER.get(ledgerId);

      // Intercept transaction creation to run AI categorization before
      // handing off to the DO, when the client didn't supply a category.
      if (url.pathname === "/transactions" && request.method === "POST") {
        return withCors(await handleCreateTransaction(request, env, ledger), cors);
      }

      // Everything else proxies straight through to the user's ledger DO.
      const forwardUrl = new URL(request.url);
      const doResponse = await ledger.fetch(new Request(forwardUrl.toString(), request));
      return withCors(doResponse, cors);
    } catch (err) {
      console.error("bookkeeping worker error:", err);
      return withCors(Response.json({ error: "internal_error" }, { status: 500 }), cors);
    }
  },
} satisfies ExportedHandler<Env>;

async function handleCreateTransaction(
  request: Request,
  env: Env,
  ledger: DurableObjectStub
): Promise<Response> {
  const body = (await request.json()) as {
    accountId?: string;
    date?: number;
    amountCents?: number;
    description?: string;
    categoryId?: string | null;
  };

  if (!body.accountId || body.amountCents === undefined || !body.description) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }

  let categoryId = body.categoryId ?? null;
  let aiSuggested = false;

  if (!categoryId) {
    const categoriesRes = await ledger.fetch(new Request("https://ledger/categories"));
    const { categories } = (await categoriesRes.json()) as { categories: { id: string; name: string; kind: string }[] };
    const suggested = await suggestCategory(
      env.AI,
      body.description,
      body.amountCents,
      categories as any
    );
    if (suggested) {
      categoryId = suggested;
      aiSuggested = true;
    }
  }

  const createRes = await ledger.fetch(
    new Request("https://ledger/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, categoryId, aiSuggested }),
    })
  );

  return createRes;
}

async function requireSession(request: Request, env: Env): Promise<SessionPayload | null> {
  const token = bearerOrCookieToken(request);
  if (!token) return null;

  const res = await fetch(`${env.AUTH_API_URL}/session/verify`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as SessionPayload & { valid: boolean };
  return data.valid ? data : null;
}

function bearerOrCookieToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);

  // Browser requests arrive with the ih_session cookie set by
  // insighthunter-dashboard (Domain=.insighthunter.app covers this subdomain).
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
