import { Hono } from 'hono';
import type { Env } from '../types/env';
import { OAuthService } from '../services/oauthService';
import { OrgService } from '../services/orgService';
import { TokenService } from '../services/tokenService';

const callback = new Hono<{ Bindings: Env }>();

callback.get('/', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const provider = c.req.query('provider') || 'google';

  if (!code || !state) {
    return c.redirect('https://auth.insighthunter.app/login?error=missing_params');
  }

  // Validate PKCE state
  const storedState = await c.env.IH_AUTH_KV.get(`oauth:state:${state}`);
  if (!storedState) {
    return c.redirect('https://auth.insighthunter.app/login?error=invalid_state');
  }
  await c.env.IH_AUTH_KV.delete(`oauth:state:${state}`);

  const stateData = JSON.parse(storedState) as { redirectUri: string };

  const oauthService = new OAuthService(c.env);
  const profile = await oauthService.exchangeCode(provider, code);

  if (!profile) {
    return c.redirect('https://auth.insighthunter.app/login?error=oauth_failed');
  }

  const orgService = new OrgService(c.env);
  const user = await orgService.findOrCreateOAuthUser(profile, provider);

  const tokenService = new TokenService(c.env);
  const { accessToken, refreshToken } = await tokenService.createTokenPair(user);

  const redirectUri = stateData.redirectUri || 'https://insighthunter.app/dashboard';

  c.header('Set-Cookie', [
    `ih_session=${accessToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600; Domain=.insighthunter.app`,
    `ih_refresh=${refreshToken}; HttpOnly; Secure; SameSite=Lax; Path=/refresh; Max-Age=2592000; Domain=.insighthunter.app`,
  ].join(', '));

  return c.redirect(redirectUri);
});

export default callback;
