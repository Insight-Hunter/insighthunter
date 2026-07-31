// packages/auth/index.ts
// Single identity provider for all InsightHunter apps
// Handles JWT issuance, org context, role resolution

import type { D1Database, KVNamespace } from "@cloudflare/workers-types";

export interface Env {
  DB: D1Database;
  AUTH_KV: KVNamespace;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
}

export interface TokenPayload {
  sub: string;           // user_id
  org: string;           // org_id
  role: OrgRole;
  email: string;
  iat: number;
  exp: number;
}

export type OrgRole =
  | "owner"
  | "admin"
  | "accountant"
  | "payroll_manager"
  | "advisor"
  | "read_only";

// App-level permission matrix
export type AppSlug =
  | "insights"
  | "bookkeeping"
  | "payroll"
  | "advisor"
  | "bizforma"
  | "pbx"
  | "admin";

const APP_PERMISSIONS: Record<OrgRole, AppSlug[]> = {
  owner: ["insights", "bookkeeping", "payroll", "advisor", "bizforma", "pbx", "admin"],
  admin: ["insights", "bookkeeping", "payroll", "advisor", "bizforma", "pbx"],
  accountant: ["insights", "bookkeeping", "advisor"],
  payroll_manager: ["payroll", "insights"],
  advisor: ["insights", "advisor"],
  read_only: ["insights"],
};

export function canAccess(role: OrgRole, app: AppSlug): boolean {
  return APP_PERMISSIONS[role]?.includes(app) ?? false;
}

export async function verifyToken(
  token: string,
  secret: string
): Promise<TokenPayload | null> {
  try {
    const [headerB64, payloadB64, sigB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !sigB64) return null;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const sig = Uint8Array.from(atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
      c.charCodeAt(0)
    );
    const valid = await crypto.subtle.verify("HMAC", key, sig, data);
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64)) as TokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function issueToken(
  payload: Omit<TokenPayload, "iat" | "exp">,
  secret: string,
  expiresInSeconds = 3600
): Promise<string> {
  const encoder = new TextEncoder();
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = btoa(
    JSON.stringify({ ...payload, iat: now, exp: now + expiresInSeconds })
  );

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(`${header}.${body}`));
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${header}.${body}.${sig}`;
}
