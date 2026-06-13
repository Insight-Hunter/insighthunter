export interface Env {
  // Cloudflare Access
  TEAM_DOMAIN: string;   // https://<team>.cloudflareaccess.com
  POLICY_AUD: string;    // AUD tag from Zero Trust → Application

  // Downstream platform worker
  PLATFORM_WORKER?: Fetcher;

  // Session storage (optional, for server-side sessions)
  SESSIONS?: KVNamespace;

  ENVIRONMENT: string;
}

export interface AccessJWTPayload {
  aud: string[];
  email: string;
  name?: string;
  sub: string;
  iss: string;
  iat: number;
  exp: number;
  groups?: string[];
}

export interface CloudflareIdentity {
  email: string;
  name: string;
  groups: string[];
  user_uuid: string;
  account_id?: string;
}
