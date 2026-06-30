import type { ISODate, UUID } from './common.js';

export interface JwtPayload {
  sub: UUID;
  orgId: UUID;
  email: string;
  role: string;
  sessionId: UUID;
  iat: number;
  exp: number;
}

export interface Session {
  id: UUID;
  userId: UUID;
  createdAt: ISODate;
  expiresAt: ISODate;
  ipAddress: string;
  userAgent: string;
}
