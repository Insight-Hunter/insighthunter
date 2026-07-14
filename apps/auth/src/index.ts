import { Hono } from "hono";
import { clearSessionCookie, createSessionCookie } from "@insighthunter/auth-shared";

type Env = {
  Bindings: {
    APP_NAME: string;
    DB: D1Database;
    SESSION_TTL_SECONDS: string;
  };
};

const app = new Hono<Env>();

app.get("/health", (c) => c.json({ ok: true, service: c.env.APP_NAME }));

app.get("/login", (c) => {
  const redirectUri = c.req.query("redirect_uri") ?? "https://insighthunter.app/auth/callback";
  const plan = c.req.query("plan") ?? "";

  return c.html(`
    <!doctype html>
    <html>
      <body style="font-family:sans-serif;padding:40px">
        <h1>Log in</h1>
        <form method="post" action="/callback">
          <input type="hidden" name="redirect_uri" value="${redirectUri}" />
          <input type="hidden" name="plan" value="${plan}" />
          <label>Email <input type="email" name="email" required /></label>
          <button type="submit">Continue</button>
        </form>
      </body>
    </html>
  `);
});

app.get("/register", (c) => {
  const redirectUri = c.req.query("redirect_uri") ?? "https://insighthunter.app/auth/callback";
  const plan = c.req.query("plan") ?? "";

  return c.html(`
    <!doctype html>
    <html>
      <body style="font-family:sans-serif;padding:40px">
        <h1>Create account</h1>
        <form method="post" action="/callback">
          <input type="hidden" name="redirect_uri" value="${redirectUri}" />
          <input type="hidden" name="plan" value="${plan}" />
          <label>Email <input type="email" name="email" required /></label>
          <button type="submit">Create account</button>
        </form>
      </body>
    </html>
  `);
});

app.post("/callback", async (c) => {
  const form = await c.req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const redirectUri = String(form.get("redirect_uri") ?? "https://insighthunter.app/auth/callback");
  const plan = String(form.get("plan") ?? "").trim();

  if (!email) {
    return c.text("Missing email", 400);
  }

  const now = new Date().toISOString();
  const userId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const token = crypto.randomUUID();
  const ttlSeconds = Number(c.env.SESSION_TTL_SECONDS || "604800");
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const existingUser = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first<{ id: string }>();
  const finalUserId = existingUser?.id ?? userId;

  if (!existingUser) {
    await c.env.DB.prepare(
      "INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)"
    ).bind(finalUserId, email, now).run();
  }

  await c.env.DB.prepare(
    "INSERT INTO sessions (id, token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(sessionId, token, finalUserId, expiresAt, now).run();

  const callbackUrl = new URL(redirectUri);
  callbackUrl.searchParams.set("session_token", token);

  if (plan) {
    callbackUrl.searchParams.set("plan", plan);
  }

  const response = Response.redirect(callbackUrl.toString(), 302);
  response.headers.set("Set-Cookie", createSessionCookie(token, ttlSeconds));
  return response;
});

app.get("/session/:token", async (c) => {
  const token = c.req.param("token");

  const row = await c.env.DB.prepare(`
    SELECT sessions.token, sessions.expires_at, users.id as user_id, users.email
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ?
    LIMIT 1
  `).bind(token).first<{ token: string; expires_at: string; user_id: string; email: string }>();

  if (!row) {
    return c.json({ ok: false, error: "not_found" }, 404);
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return c.json({ ok: false, error: "expired" }, 401);
  }

  return c.json({
    ok: true,
    session: {
      token: row.token,
      user: {
        subject: row.user_id,
        email: row.email
      },
      expiresAt: row.expires_at
    }
  });
});

app.post("/logout", async (c) => {
  const cookie = c.req.header("cookie") ?? "";
  const tokenMatch = cookie.match(/ih_session=([^;]+)/);
  const token = tokenMatch?.[1];

  if (token) {
    await c.env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  }

  const response = c.json({ ok: true });
  response.headers.set("Set-Cookie", clearSessionCookie());
  return response;
});

export default app;
