import type { APIRoute } from "astro";
import { getSessionToken, deleteSession, clearSessionCookie } from "@/lib/auth/session";
import type { Env } from "@/types";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const env   = (locals as any).runtime?.env as Env;
  const token = getSessionToken(request);
  if (token) await deleteSession(env.IH_SESSIONS, token);
  return redirect("/auth/login", 302, {
    headers: { "Set-Cookie": clearSessionCookie() },
  } as any);
};
