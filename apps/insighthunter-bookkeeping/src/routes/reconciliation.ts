import type { Env, AuthContext } from '../types';
import {
  startReconciliation, matchTransactions, completeReconciliation,
} from '../services/reconciliationService';
import { getReconciliationRecords } from '../db/queries';
import { trackEvent } from '../lib/analytics';

export async function handleReconciliation(
  request: Request, env: Env, auth: AuthContext, pathname: string
): Promise<Response> {
  const method = request.method;

  // GET /reconciliation
  if (method === 'GET' && pathname === '/reconciliation') {
    const url       = new URL(request.url);
    const accountId = url.searchParams.get('account_id') ?? undefined;
    const records   = await getReconciliationRecords(env.DB, auth.orgId, accountId);
    return Response.json({  records });
  }

  // POST /reconciliation/start
  if (method === 'POST' && pathname === '/reconciliation/start') {
    const body = await request.json<any>();
    const record = await startReconciliation(
      env.DB, auth.orgId, body.account_id,
      body.statement_date, body.statement_balance_cents, auth.userId,
    );
    trackEvent(env.ANALYTICS, 'reconciliation_started', auth.orgId, {
      amount: body.statement_balance_cents,
    });
    return Response.json({  record }, { status: 201 });
  }

  // POST /reconciliation/match
  if (method === 'POST' && pathname === '/reconciliation/match') {
    const body    = await request.json<any>();
    const matches = await matchTransactions(
      env.DB, auth.orgId, body.account_id,
      body.statement_lines, body.tolerance_cents ?? 0,
    );
    return Response.json({  matches });
  }

  // POST /reconciliation/complete
  if (method === 'POST' && pathname === '/reconciliation/complete') {
    const body   = await request.json<any>();
    const record = await completeReconciliation(
      env.DB, body.reconciliation_id, auth.orgId, auth.userId,
      body.cleared_balance_cents, body.statement_balance_cents,
    );
    trackEvent(env.ANALYTICS, 'reconciliation_completed', auth.orgId, {
      amount: body.statement_balance_cents,
    });
    return Response.json({  record });
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}
