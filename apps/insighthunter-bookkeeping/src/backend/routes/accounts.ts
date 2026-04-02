import type { Env, AuthContext } from '../types';
import type { Account } from '../types/accounting';
import { AccountType, AccountSubType } from '../types/accounting';
import {
  getAccounts, getAccountById, insertAccount, updateAccount,
} from '../db/queries';
import { accountsCacheKey, cacheGet, cacheSet, cacheDelete } from '../lib/cache';

export async function handleAccounts(
  request: Request, env: Env, auth: AuthContext, pathname: string
): Promise<Response> {
  const method = request.method;

  // GET /accounts
  if (method === 'GET' && pathname === '/accounts') {
    const cacheKey = accountsCacheKey(auth.orgId);
    const cached   = await cacheGet<Account[]>(env.KV, cacheKey);
    if (cached) return Response.json({  cached, cached: true });

    const accounts = await getAccounts(env.DB, auth.orgId);
    await cacheSet(env.KV, cacheKey, accounts, 300);
    return Response.json({  accounts });
  }

  // GET /accounts/:id
  if (method === 'GET' && pathname.match(/^\/accounts\/[^/]+$/)) {
    const id      = pathname.split('/')[2];
    const account = await getAccountById(env.DB, id, auth.orgId);
    if (!account) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({  account });
  }

  // POST /accounts
  if (method === 'POST' && pathname === '/accounts') {
    const body = await request.json<any>();
    const account: Account = {
      id:          crypto.randomUUID(),
      orgId:       auth.orgId,
      code:        body.code,
      name:        body.name,
      type:        body.type as AccountType,
      subType:     body.sub_type as AccountSubType,
      parentId:    body.parent_id ?? null,
      currency:    body.currency ?? 'USD',
      isActive:    true,
      description: body.description ?? null,
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
    };
    await insertAccount(env.DB, account);
    await cacheDelete(env.KV, accountsCacheKey(auth.orgId));
    return Response.json({  account }, { status: 201 });
  }

  // PATCH /accounts/:id
  if (method === 'PATCH' && pathname.match(/^\/accounts\/[^/]+$/)) {
    const id   = pathname.split('/')[2];
    const body = await request.json<any>();
    await updateAccount(env.DB, {
      id, orgId: auth.orgId,
      name:        body.name,
      description: body.description,
      isActive:    body.is_active ?? true,
    });
    await cacheDelete(env.KV, accountsCacheKey(auth.orgId));
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}
