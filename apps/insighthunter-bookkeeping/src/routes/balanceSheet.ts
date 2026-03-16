import type { Env, AuthContext } from '../types';
import { generateBalanceSheet } from '../services/balanceSheetService';
import { statementCacheKey, cacheGet, cacheSet } from '../lib/cache';
import { trackEvent } from '../lib/analytics';

export async function handleBalanceSheet(
  request: Request, env: Env, auth: AuthContext, pathname: string
): Promise<Response> {
  if (request.method !== 'GET' || pathname !== '/statements/balance-sheet') {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const url      = new URL(request.url);
  const asOf     = url.searchParams.get('as_of') ?? new Date().toISOString().split('T')[0];
  const currency = url.searchParams.get('currency') ?? 'USD';

  const cacheKey = statementCacheKey(auth.orgId, 'bs', asOf, asOf);
  const cached   = await cacheGet<any>(env.KV, cacheKey);
  const bs       = cached ?? await generateBalanceSheet(env.DB, auth.orgId, asOf, currency);
  if (!cached) await cacheSet(env.KV, cacheKey, bs, 600);

  trackEvent(env.ANALYTICS, 'statement_generated', auth.orgId, { source: 'balance_sheet' });
  return Response.json({  bs, cached: !!cached });
}
