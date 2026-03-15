import type { Env, AuthContext } from '../types';
import {
  createTransaction, listTransactions, getTransaction, voidTransaction,
} from '../services/transactionService';
import { applyCategoryToTransaction } from '../services/categorizationService';
import { transactionsToCSV } from '../services/exportService';
import { trackEvent } from '../lib/analytics';
import { toMinorUnits } from '../lib/currencyUtils';

export async function handleTransactions(
  request: Request, env: Env, auth: AuthContext, pathname: string
): Promise<Response> {
  const url    = new URL(request.url);
  const method = request.method;

  // GET /transactions
  if (method === 'GET' && pathname === '/transactions') {
    const transactions = await listTransactions(env.DB, {
      orgId:     auth.orgId,
      accountId: url.searchParams.get('account_id') ?? undefined,
      status:    url.searchParams.get('status') ?? undefined,
      dateFrom:  url.searchParams.get('date_from') ?? undefined,
      dateTo:    url.searchParams.get('date_to') ?? undefined,
      limit:     parseInt(url.searchParams.get('limit') ?? '100'),
      offset:    parseInt(url.searchParams.get('offset') ?? '0'),
    });

    if (url.searchParams.get('format') === 'csv') {
      return new Response(transactionsToCSV(transactions), {
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="transactions.csv"' },
      });
    }

    return Response.json({ data: transactions });
  }

  // GET /transactions/:id
  if (method === 'GET' && pathname.match(/^\/transactions\/[^/]+$/)) {
    const id = pathname.split('/')[2];
    const tx = await getTransaction(env.DB, id, auth.orgId);
    if (!tx) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ data: tx });
  }

  // POST /transactions
  if (method === 'POST' && pathname === '/transactions') {
    const body = await request.json<any>();
    const tx = await createTransaction(env.DB, {
      orgId:       auth.orgId,
      accountId:   body.account_id,
      date:        body.date,
      description: body.description,
      amountCents: toMinorUnits(body.amount, body.currency ?? 'USD'),
      currency:    body.currency ?? 'USD',
      categoryId:  body.category_id,
      metadata:    body.metadata,
    });
    trackEvent(env.ANALYTICS, 'transaction_created', auth.orgId, { amount: tx.amount });
    return Response.json({ data: tx }, { status: 201 });
  }

  // PATCH /transactions/:id/category

  // PATCH /transactions/:id/category
  if (method === 'PATCH' && pathname.match(/^\/transactions\/[^/]+\/category$/)) {
    const id   = pathname.split('/')[2];
    const body = await request.json<{ category_id: string }>();
    await applyCategoryToTransaction(env.DB, id, auth.orgId, body.category_id);
    trackEvent(env.ANALYTICS, 'transaction_categorized', auth.orgId);
    return Response.json({ ok: true });
  }

  // DELETE /transactions/:id  (void)
  if (method === 'DELETE' && pathname.match(/^\/transactions\/[^/]+$/)) {
    const id = pathname.split('/')[2];
    await voidTransaction(env.DB, id, auth.orgId);
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}
