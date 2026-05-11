import type { Env, AuthContext } from '../types';
import { generateCashFlow } from '../services/cashFlowService';
import { statementCacheKey, cacheGet, cacheSet } from '../lib/cache';
import { trackEvent } from '../lib/analytics';

export async function handleCashFlow(
  request: Request, env: Env, auth: AuthContext, pathname: string
): Promise<Response> {
  if (request.method !== 'GET' || pathname !== '/statements/cash-flow') {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const url      = new URL(request.url);
  const from     = url.searchParams.get('date_from') ?? '';
  const to       = url.searchParams.get('date_to')   ?? '';
  const currency = url.searchParams.get('currency')  ?? 'USD';

  if (!from || !to) {
    return Response.json({ error: 'date_from and date_to are required' }, { status: 400 });
  }

  const cacheKey = statementCacheKey(auth.orgId, 'cf', from, to);
  const cached   = await cacheGet<any>(env.KV, cacheKey);
  const cf       = cached ?? await generateCashFlow(env.DB, auth.orgId, from, to, currency);
  if (!cached) await cacheSet(env.KV, cacheKey, cf, 600);

  trackEvent(env.ANALYTICS, 'statement_generated', auth.orgId, { source: 'cash_flow' });
  return Response.json({  cf, cached: !!cached });
}
