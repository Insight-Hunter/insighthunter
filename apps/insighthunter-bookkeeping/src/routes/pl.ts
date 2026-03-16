import type { Env, AuthContext } from '../types';
import { generatePL } from '../services/plService';
import { plToCSV, plToHTML } from '../services/exportService';
import { statementCacheKey, cacheGet, cacheSet } from '../lib/cache';
import { trackEvent } from '../lib/analytics';

export async function handlePL(
  request: Request, env: Env, auth: AuthContext, pathname: string
): Promise<Response> {
  if (request.method !== 'GET' || pathname !== '/statements/pl') {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const url      = new URL(request.url);
  const from     = url.searchParams.get('date_from') ?? '';
  const to       = url.searchParams.get('date_to')   ?? '';
  const format   = url.searchParams.get('format')    ?? 'json';
  const currency = url.searchParams.get('currency')  ?? 'USD';

  if (!from || !to) {
    return Response.json({ error: 'date_from and date_to are required' }, { status: 400 });
  }

  const cacheKey = statementCacheKey(auth.orgId, 'pl', from, to);
  const cached   = await cacheGet<any>(env.KV, cacheKey);
  const pl       = cached ?? await generatePL(env.DB, auth.orgId, from, to, currency);
  if (!cached) await cacheSet(env.KV, cacheKey, pl, 600);

  trackEvent(env.ANALYTICS, 'statement_generated', auth.orgId, { source: 'pl' });

  if (format === 'csv') {
    return new Response(plToCSV(pl), {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="pl.csv"' },
    });
  }
  if (format === 'html') {
    return new Response(plToHTML(pl), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  return Response.json({  pl, cached: !!cached });
}
