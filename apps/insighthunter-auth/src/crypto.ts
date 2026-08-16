import type { SessionPayload } from "./types.js";

const PBKDF2_ITERATIONS = 210_000; // OWASP 2024+ recommendation for PBKDF2-SHA256

/** Hash a password with PBKDF2-SHA256. Returns "iterations:saltHex:hashHex". */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const hashHex = toHex(new Uint8Array(bits));
  const saltHex = toHex(salt);
  return `${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

/** Constant-time-ish verify (relies on Web Crypto internals; hash comparison
 *  itself is done byte-by-byte to avoid short-circuit timing leaks). */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [iterStr, saltHex, hashHex] = stored.split(":");
  const iterations = parseInt(iterStr, 10);
  const salt = fromHex(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const computedHex = toHex(new Uint8Array(bits));
  return timingSafeEqual(computedHex, hashHex);
}

/** Sign a session payload as base64url(json).base64url(hmac) — a minimal JWT-like token. */
export async function signSession(
  payload: SessionPayload,
  secret: string
): Promise<string> {
  const body = base64url(JSON.stringify(payload));
  const sig = await hmac(body, secret);
  return `${body}.${sig}`;
}

export async function verifySession(
  token: string,
  secret: string
): Promise<SessionPayload | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await hmac(body, secret);
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const payload: SessionPayload = JSON.parse(atob(fromBase64url(body)));
    if (payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return toHex(new Uint8Array(sig));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
function base64url(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64url(str: string): string {
  return str.replace(/-/g, "+").replace(/_/g, "/");
}
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
