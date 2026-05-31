export const packageName = 'ih-auth-client';

export { signJWT, verifyJWT, type JWTPayload } from './jwt';

export function extractBearer(authHeader: string | null | undefined): string | null {
	if (!authHeader) return null;
	if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
	return null;
}

import type { AuthUser } from '@ih/types';
export function jwtToAuthUser(payload: JWTPayload): AuthUser {
	return {
		userId: payload.userId,
		orgId: payload.orgId,
		email: payload.email,
		tier: payload.tier,
	};
}
