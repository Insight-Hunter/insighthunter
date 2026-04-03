import type { APIRoute } from "astro";
import { QBOClient } from "@/lib/qbo/client";
import { getSessionToken, getSession } from "@/lib/auth/session";
import type { Env, QBOConnection } from "@/types";

export const GET: APIRoute = async ({ request, url, locals }) => {
  const env     = (locals as any).runtime?.env as Env;
  const token   = getSessionToken(request);
  const session = token ? await getSession(env.IH_SESSIONS, token) : null;
  if (!session) return new Response(null, { status: 401 });

  const start = url.searchParams.get("start");
  const end   = url.searchParams.get("end");
  if (!start || !end) return new Response(JSON.stringify({ message: "start and end required." }), { status: 400 });

  const raw = await env.IH_CACHE.get(`qbo:${session.userId}`);
  if (!raw) return new Response(null, { status: 404 });

  const conn   = JSON.parse(raw) as QBOConnection;
  const client = new QBOClient(conn, (env.QBO_ENVIRONMENT as any) ?? "sandbox");
  const pl     = await client.getProfitAndLoss(start, end);

  return new Response(JSON.stringify(pl), { headers: { "Content-Type": "application/json" } });
};
