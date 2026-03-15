import { handleCors, corsHeaders } from './middleware/cors';
import { authMiddleware } from './middleware/auth';
import { rateLimit, rateLimitHeaders } from './middleware/rateLimit';
import { handleTransactions } from './routes/transactions';
import { handleAccounts } from './routes/accounts';
import { handleJournal } from './routes/journal';
import { handleReconciliation } from './routes/reconciliation';
import { handlePL } from './routes/pl';
import { handleBalanceSheet } from './routes/balanceSheet';
import { handleCashFlow } from './routes/cashFlow';
import { handleCategories } from './routes/categories';
import { handleImportQueue } from './queues/importQueue';
import { handleReconciliationQueue } from './queues/reconciliationQueue';
import { logger } from './lib/logger';
import type { Env, ImportJobPayload, ReconciliationJobPayload } from './types';
import { ImportWorkflow } from './workflows/ImportWorkflow';
import { ReconciliationWorkflow } from './workflows/ReconciliationWorkflow';
import { CategorizationAgent } from './agents/CategorizationAgent';

export { ImportWorkflow, ReconciliationWorkflow, CategorizationAgent };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // CORS preflight
    const corsPreFlight = handleCors(request, env.CORS_ORIGINS);
    if (corsPreFlight) return corsPreFlight;

    const origin  = request.headers.get('Origin');
    const headers = corsHeaders(origin, env.CORS_ORIGINS);

    const url      = new URL(request.url);
    const pathname = url.pathname.replace(/^\/v1/, ''); // strip /v1 prefix

    // Health check (no auth required)
    if (pathname === '/health') {
      return Response.json({ status: 'ok', service: 'bookkeeping', ts: Date.now() }, { headers });
    }

    // Auth
    const authResult = await authMiddleware(request, env);
    if (authResult instanceof Response) return new Response(authResult.body, {
      status: authResult.status,
      headers: { ...Object.fromEntries(authResult.headers), ...headers },
    });
    const auth = authResult;

    // Rate limit
    const rl = await rateLimit(env.KV, auth.orgId, auth.plan);
    const rlHeaders = { ...headers, ...rateLimitHeaders(rl.remaining, rl.resetAt) };
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429, headers: { ...rlHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      let response: Response;

      if (pathname.startsWith('/transactions'))      response = await handleTransactions(request, env, auth, pathname);
      else if (pathname.startsWith('/accounts'))     response = await handleAccounts(request, env, auth, pathname);
      else if (pathname.startsWith('/journal'))      response = await handleJournal(request, env, auth, pathname);
      else if (pathname.startsWith('/reconcili'))    response = await handleReconciliation(request, env, auth, pathname);
      else if (pathname.startsWith('/statements/pl')) response = await handlePL(request, env, auth, pathname);
      else if (pathname.startsWith('/statements/balance-sheet')) response = await handleBalanceSheet(request, env, auth, pathname);
      else if (pathname.startsWith('/statements/cash-flow'))     response = await handleCashFlow(request, env, auth, pathname);
      else if (pathname.startsWith('/categories'))   response = await handleCategories(request, env, auth, pathname);
      else if (pathname.startsWith('/import')) {
        // POST /import  — upload file to R2 then enqueue workflow
        if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers });
        const form      = await request.formData();
        const file      = form.get('file') as File;
        const format    = (form.get('format') as string) ?? 'csv';
        const accountId = (form.get('account_id') as string) ?? '';
        const fileKey   = `imports/${auth.orgId}/${crypto.randomUUID()}.${format}`;

        await env.R2.put(fileKey, await file.arrayBuffer(), {
          httpMeta { contentType: file.type },
        });

        const instance = await env.IMPORT_WORKFLOW.create({
          params: { orgId: auth.orgId, userId: auth.userId, fileKey, format: format as any, accountId },
        });

        response = Response.json({ workflowId: instance.id, status: 'queued' }, { status: 202 });
      }
      else {
        response = Response.json({ error: 'Not found' }, { status: 404 });
      }

      // Attach CORS + rate-limit headers to all responses
      const newHeaders = new Headers(response.headers);
      Object.entries(rlHeaders).forEach(([k, v]) => newHeaders.set(k, v));
      return new Response(response.body, { status: response.status, headers: newHeaders });

    } catch (err) {
      logger.error('unhandled_error', { error: (err as Error).message, pathname });
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500, headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  },

  async queue(
    batch: MessageBatch<ImportJobPayload | ReconciliationJobPayload>,
    env: Env,
  ): Promise<void> {
    if (batch.queue === 'bookkeeping-import') {
      await handleImportQueue(batch as MessageBatch<ImportJobPayload>, env);
    } else if (batch.queue === 'bookkeeping-reconciliation') {
      await handleReconciliationQueue(batch as MessageBatch<ReconciliationJobPayload>, env);
    }
  },
} satisfies ExportedHandler<Env>;
