/**
 * PBKDF2-based password hashing using Web Crypto API.
 * Compatible with Cloudflare Workers (no Node.js bcrypt needed).
 *
 * Format: "pbkdf2:<iterations>:<saltHex>:<hashHex>"
 */

const ITERATIONS = 100_000;
const HASH_LEN   = 32; // 256 bits
const ALG        = "SHA-256";

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuf(hex: string): Uint8Array {
  const result = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    result[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return result;
}

export async function hashPassword(password: string): Promise<string> {
  const saltBuf = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = bufToHex(saltBuf.buffer);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBuf, iterations: ITERATIONS, hash: ALG },
    baseKey,
    HASH_LEN * 8
  );

  return `pbkdf2:${ITERATIONS}:${saltHex}:${bufToHex(derived)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;

  const [, iterStr, saltHex, hashHex] = parts;
  const iterations = parseInt(iterStr);
  const salt = hexToBuf(saltHex);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: ALG },
    baseKey,
    HASH_LEN * 8
  );

  // Constant-time comparison
  const a = new Uint8Array(derived);
  const b = hexToBuf(hashHex);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function generateSecureToken(bytes = 32): string {
  return bufToHex(crypto.getRandomValues(new Uint8Array(bytes)).buffer);
}
