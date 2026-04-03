import type { Session, User, Env } from "@/types";

const SESSION_PREFIX = "session:";
const USER_PREFIX    = "user:";

export async function createSession(
  kv: KVNamespace,
  user: User,
  ttlSeconds: number
): Promise<string> {
  const token     = crypto.randomUUID();
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const session: Session = { userId: user.id, expiresAt, token };

  await kv.put(
    `${SESSION_PREFIX}${token}`,
    JSON.stringify(session),
    { expirationTtl: ttlSeconds }
  );
  return token;
}

export async function getSession(
  kv: KVNamespace,
  token: string
): Promise<Session | null> {
  const raw = await kv.get(`${SESSION_PREFIX}${token}`);
  if (!raw) return null;
  const session = JSON.parse(raw) as Session;
  if (Date.now() > session.expiresAt) {
    await kv.delete(`${SESSION_PREFIX}${token}`);
    return null;
  }
  return session;
}

export async function deleteSession(
  kv: KVNamespace,
  token: string
): Promise<void> {
  await kv.delete(`${SESSION_PREFIX}${token}`);
}

export async function getUser(
  kv: KVNamespace,
  userId: string
): Promise<User | null> {
  const raw = await kv.get(`${USER_PREFIX}${userId}`);
  return raw ? (JSON.parse(raw) as User) : null;
}

export async function saveUser(
  kv: KVNamespace,
  user: User
): Promise<void> {
  await kv.put(`${USER_PREFIX}${user.id}`, JSON.stringify(user));
}

export function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const match  = cookie.match(/ih_session=([^;]+)/);
  return match?.[1] ?? null;
}

export function setSessionCookie(token: string, ttlSeconds: number): string {
  const expires = new Date(Date.now() + ttlSeconds * 1000).toUTCString();
  return `ih_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires}`;
}

export function clearSessionCookie(): string {
  return "ih_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}
