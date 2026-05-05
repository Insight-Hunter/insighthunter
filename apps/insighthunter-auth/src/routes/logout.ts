import { Hono } from 'hono';
import type { Env } from '../types/env';

const logout = new Hono<{ Bindings: Env }>();

logout.post('/', async (c) => {
  const cookies = c.req.header('Cookie') || '';
  const match = cookies.match(/ih_refresh=([^;]+)/);
  const refreshToken = match?.[1];

  if (refreshToken) {
    const tokenHash = await hashToken(refreshToken);
    await c.env.IH_AUTH_KV.delete(`refresh:${tokenHash}`);
  }

  c.header('Set-Cookie', [
    `ih_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0; Domain=.insighthunter.app`,
    `ih_refresh=; HttpOnly; Secure; SameSite=Lax; Path=/refresh; Max-Age=0; Domain=.insighthunter.app`,
  ].join(', '));

  return c.json({ success: true });
});

async function hashToken(token: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(token));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default logout;
