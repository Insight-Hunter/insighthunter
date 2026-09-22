import type { SessionPayload, Tier, OrgRole } from "./types.js";

const PBKDF2_ITERATIONS = 100_000; // Workers Web Crypto caps PBKDF2 at 100,000 iterations

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
  return `${PBKDF2_ITERATIONS}:${toHex(salt)}:${toHex(new Uint8Array(bits))}`;
}

/**
 * Constant-time-ish verify.
 * Hash comparison is done byte-by-byte to avoid short-circuit timing leaks.
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [iterStr, saltHex, hashHex] = stored.split(":");
  if (!iterStr || !saltHex || !hashHex) return false;
  const iterations = Number.parseInt(iterStr, 10);
  if (!Number.isSafeInteger(iterations) || iterations < 1 || iterations > PBKDF2_ITERATIONS) return false;
  const salt = fromHex(saltHex);
  if (!salt || !/^[0-9a-f]{64}$/i.test(hashHex)) return false;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: Uint8Array.from(salt).buffer, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return timingSafeEqual(toHex(new Uint8Array(bits)), hashHex);
}

/** Sign a session payload as base64url(json).base64url(hmac) — a minimal JWT-like token. */
export async function signSession(
  payload: SessionPayload,
  secret: string
): Promise<string> {
  const body = base64url(JSON.stringify(payload));
  const sig  = await hmac(body, secret);
  return `${body}.${sig}`;
}

export async function verifySession(
  token: string,
  secret: string
): Promise<SessionPayload | null> {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig  = token.slice(dot + 1);
  const expected = await hmac(body, secret);
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const payload: unknown = JSON.parse(atob(fromBase64url(body)));
    if (!isSessionPayload(payload) || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Internals ────────────────────────────────────────────────────────────────

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

const VALID_TIERS = new Set<Tier>(["lite", "standard", "pro", "enterprise"]);
const VALID_ROLES = new Set<OrgRole>(["owner", "admin", "member", "viewer"]);

function isTier(v: unknown): v is Tier  { return typeof v === "string" && VALID_TIERS.has(v as Tier); }
function isRole(v: unknown): v is OrgRole { return typeof v === "string" && VALID_ROLES.has(v as OrgRole); }

function isSessionPayload(value: unknown): value is SessionPayload {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p["userId"]    === "string" &&
    typeof p["email"]     === "string" &&
    typeof p["name"]      === "string" &&
    typeof p["orgName"]   === "string" &&
    isRole(p["role"])                  &&
    isTier(p["tier"])                  &&
    typeof p["issuedAt"]  === "number" &&
    typeof p["expiresAt"] === "number"
  );
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function fromHex(hex: string): Uint8Array | null {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
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
