import type { APIRoute } from "astro";
import { getUser, createSession, setSessionCookie } from "@/lib/auth/session";
import type { Env, User } from "@/types";

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env as Env;

  try {
    const { email, password } = await request.json() as { email: string; password: string };
    if (!email || !password) {
      return new Response(JSON.stringify({ message: "Email and password are required." }), { status: 400 });
    }

    // Look up user by email index
    const userId = await env.IH_SESSIONS.get(`email:${email.toLowerCase()}`);
    if (!userId) {
      return new Response(JSON.stringify({ message: "Invalid credentials." }), { status: 401 });
    }

    const user = await getUser(env.IH_SESSIONS, userId);
    if (!user) {
      return new Response(JSON.stringify({ message: "Invalid credentials." }), { status: 401 });
    }

    // TODO: verify hashed password (e.g. using Web Crypto API / bcrypt WASM)
    // const valid = await verifyPassword(password, user.passwordHash);
    // if (!valid) return new Response(...401...);

    const ttl   = parseInt(env.SESSION_EXPIRY ?? "604800");
    const token = await createSession(env.IH_SESSIONS, user, ttl);
    const cookie = setSessionCookie(token, ttl);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Set-Cookie": cookie, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ message: "Internal error." }), { status: 500 });
  }
};
