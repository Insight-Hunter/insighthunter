// apps/insighthunter-auth/src/pages/api/auth/logout.ts
import type { APIRoute } from 'astro';
import { deleteSession } from '../../../lib/auth';

export const POST: APIRoute = async ({ cookies, locals }) => {
  const token = cookies.get('auth_token')?.value;
  if (token) {
    await deleteSession(locals.runtime.env, token);
  }
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'auth_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    },
  });
};
