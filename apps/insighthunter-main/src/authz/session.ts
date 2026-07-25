import { extractSessionToken } from "./../../packages/auth-shared/dist/index.js";

export type SessionLookup = {
  ok: boolean;
  session?: {
    token: string;
    user: {
      subject: string;
      email?: string;
    };
    expiresAt: string;
  };
};

export async function getSession(
  authBaseUrl: string,
  request: Request,
): Promise<SessionLookup["session"] | null> {
  const token = extractSessionToken(request);

  if (!token) {
    return null;
  }

  const response = await fetch('${authBaseUrl}/session/${encodeURIComponent(token)}');

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as SessionLookup;
  return payload.ok ? payload.session ?? null : null;
}

export async function ensureCustomer(
  db: D1Database,
  userId: string,
  email: string,
): Promise<{ id: string; userId: string; email: string; stripeCustomerId?: string | null }> {
  const existing = await db.prepare(
    "SELECT id, user_id, email, stripe_customer_id FROM customers WHERE user_id = ? LIMIT 1"
  ).bind(userId).first<{ id: string; user_id: string; email: string; stripe_customer_id?: string | null }>();

  if (existing) {
    return {
      id: existing.id,
      userId: existing.user_id,
      email: existing.email,
      stripeCustomerId: existing.stripe_customer_id ?? null,
    };
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await db.prepare(
    "INSERT INTO customers (id, user_id, email, created_at) VALUES (?, ?, ?, ?)"
  ).bind(id, userId, email, createdAt).run();

  return { id, userId, email, stripeCustomerId: null };
}
