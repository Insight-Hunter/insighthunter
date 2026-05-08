import type { Env } from '../types/env';

export interface OAuthProfile {
  email: string;
  name: string;
  provider_id: string;
}

export class OAuthService {
  constructor(private env: Env) {}

  async exchangeCode(provider: string, code: string): Promise<OAuthProfile | null> {
    if (provider === 'google') return this.exchangeGoogle(code);
    return null;
  }

  private async exchangeGoogle(code: string): Promise<OAuthProfile | null> {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.env.GOOGLE_CLIENT_ID,
        client_secret: this.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: 'https://auth.insighthunter.app/auth/callback?provider=google',
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) return null;
    const tokens = await tokenRes.json() as any;

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileRes.ok) return null;
    const profile = await profileRes.json() as any;

    return { email: profile.email, name: profile.name, provider_id: profile.id };
  }
}
