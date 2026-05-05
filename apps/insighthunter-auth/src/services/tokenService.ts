import type { Env } from '../types/env';
import type { DBUser } from './authService';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class TokenService {
  constructor(private env: Env) {}

  async createTokenPair(user: DBUser): Promise<TokenPair> {
    const accessToken = await this.signJWT({
      userId: user.id,
      orgId: user.org_id,
      tier: user.tier,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      iat: Math.floor(Date.now() / 1000),
    });

    const refreshToken = await this.generateRefreshToken();
    const tokenHash = await this.hashToken(refreshToken);

    // Store refresh token hash in KV (30 days)
    await this.env.IH_AUTH_KV.put(
      `refresh:${tokenHash}`,
      JSON.stringify({ userId: user.id, orgId: user.org_id, tier: user.tier, email: user.email }),
      { expirationTtl: 2592000 }
    );

    return { accessToken, refreshToken };
  }

  async rotateRefreshToken(refreshToken: string): Promise<TokenPair | null> {
    const tokenHash = await this.hashToken(refreshToken);
    const raw = await this.env.IH_AUTH_KV.get(`refresh:${tokenHash}`, 'json') as any;

    if (!raw) return null;

    // Revoke old token
    await this.env.IH_AUTH_KV.delete(`refresh:${tokenHash}`);

    const user = { id: raw.userId, email: raw.email, org_id: raw.orgId, tier: raw.tier, password_hash: '', is_active: 1 };
    return this.createTokenPair(user as any);
  }

  private async signJWT(payload: Record<string, unknown>): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const enc = new TextEncoder();

    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const sigInput = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
      'raw', enc.encode(this.env.JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );

    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(sigInput));
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    return `${sigInput}.${sigB64}`;
  }

  private async generateRefreshToken(): Promise<string> {
    const bytes = crypto.getRandomValues(new Uint8Array(48));
    return btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  async hashToken(token: string): Promise<string> {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(token));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
