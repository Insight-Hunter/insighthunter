export interface AuthenticatedUser {
  readonly subject: string;
  readonly email?: string;
  readonly orgId?: string;
}

export interface JwtPayload {
  readonly sub: string;
  readonly email?: string;
  readonly org_id?: string;
  readonly iss?: string;
  readonly aud?: string | string[];
  readonly exp?: number;
  readonly nbf?: number;
  readonly iat?: number;
  readonly [key: string]: unknown;
}

export interface Jwk {
  readonly kty: string;
  readonly kid?: string;
  readonly use?: string;
  readonly alg?: string;
  readonly n?: string;
  readonly e?: string;
}

export interface JwksDocument {
  readonly keys: readonly Jwk[];
}

export interface SessionRecord {
  readonly token: string;
  readonly user: AuthenticatedUser;
  readonly expiresAt: string;
}
