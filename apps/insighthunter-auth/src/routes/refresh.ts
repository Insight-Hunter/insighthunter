import { Hono } from 'hono';
import { TokenService } from '../services/tokenService';
import type { Env } from '../types/env';

const refresh = new Hono<{ Bindings: Env }>();

refresh.post('/', async (c) => {
  const cookies = c.req.header('Cookie') || '';
  const match = cookies.match(/ih_refresh=([^;]+)/);
  const refreshToken = match?.[1];

  if (!refreshToken) {
    return c.json({ error: 'No refresh token', code: 'NO_REFRESH_TOKEN' }, 401);
  }

  const tokenService = new TokenService(c.env);
  const result = await tokenService.rotateRefreshToken(refreshToken);

  if (!result) {
    return c.json({ error: 'Invalid refresh token', code: 'INVALID_REFRESH' }, 401);
  }

  c.header('Set-Cookie', [
    `ih_session=${result.accessToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600; Domain=.insighthunter.app`,
    `ih_refresh=${result.refreshToken}; HttpOnly; Secure; SameSite=Lax; Path=/refresh; Max-Age=2592000; Domain=.insighthunter.app`,
  ].join(', '));

  return c.json({ success: true, accessToken: result.accessToken });
});

export default refresh;
