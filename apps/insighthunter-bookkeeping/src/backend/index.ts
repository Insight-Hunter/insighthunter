// apps/insighthunter-bookkeeping/src/backend/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { BookkeepingLedger } from './durable-objects/BookkeepingLedger';
import { InvoiceManager } from './durable-objects/InvoiceManager';
import { SubscriptionManager } from './durable-objects/SubscriptionManager';
import { BankConnectionManager } from './durable-objects/BankConnectionManager';

export { BookkeepingLedger, InvoiceManager, SubscriptionManager, BankConnectionManager };

export interface Env {
  // Durable Objects
  BOOKKEEPING_LEDGER: DurableObjectNamespace;
  INVOICE_MANAGER: DurableObjectNamespace;
  SUBSCRIPTION_MANAGER: DurableObjectNamespace;
  BANK_CONNECTION_MANAGER: DurableObjectNamespace;
  
  // R2 Buckets
  SPREADSHEET_UPLOADS: R2Bucket;

  // Secrets
  QUICKBOOKS_CLIENT_ID: string;
  QUICKBOOKS_CLIENT_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  PLAID_CLIENT_ID: string;
  PLAID_SECRET: string;
  OPENAI_API_KEY: string;
  
  // Vars
  QUICKBOOKS_ENVIRONMENT: string;
  QUICKBOOKS_REDIRECT_URI: string;
  FRONTEND_URL: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: (origin) => origin,
  credentials: true,
}));

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// NOTE: The X-Authenticated-User-Id header is added by the insighthunter-main gateway.

// Subscription routes
app.post('/api/subscriptions/create', async (c) => {
  const userId = c.req.header('X-Authenticated-User-Id');
  const { planId } = await c.req.json();
  const id = c.env.SUBSCRIPTION_MANAGER.idFromName(userId);
  const manager = c.env.SUBSCRIPTION_MANAGER.get(id);
  return manager.fetch(c.req.raw);
});

app.get('/api/subscriptions/:userId', async (c) => {
  const userId = c.req.param('userId'); // or from header
  const id = c.env.SUBSCRIPTION_MANAGER.idFromName(userId);
  const manager = c.env.SUBSCRIPTION_MANAGER.get(id);
  return manager.fetch(c.req.raw);
});

app.post('/api/subscriptions/:userId/cancel', async (c) => {
  const userId = c.req.param('userId'); // or from header
  const id = c.env.SUBSCRIPTION_MANAGER.idFromName(userId);
  const manager = c.env.SUBSCRIPTION_MANAGER.get(id);
  return manager.fetch(c.req.raw);
});

// Stripe webhook
app.post('/api/webhooks/stripe', async (c) => {
  const id = c.env.SUBSCRIPTION_MANAGER.idFromName('webhook-handler');
  const manager = c.env.SUBSCRIPTION_MANAGER.get(id);
  return manager.fetch(c.req.raw);
});

// Bank connection routes
app.all('/api/bank/*', async (c) => {
  const userId = c.req.header('X-Authenticated-User-Id');
  const id = c.env.BANK_CONNECTION_MANAGER.idFromName(userId);
  const manager = c.env.BANK_CONNECTION_MANAGER.get(id);
  return manager.fetch(c.req.raw);
});

// Ledger routes
app.all('/api/ledger/:companyId/*', async (c) => {
  const companyId = c.req.param('companyId');
  const id = c.env.BOOKKEEPING_LEDGER.idFromName(companyId);
  const ledger = c.env.BOOKKEEPING_LEDGER.get(id);
  return ledger.fetch(c.req.raw);
});

// Invoice routes
app.all('/api/invoices/:companyId/*', async (c) => {
  const companyId = c.req.param('companyId');
  const id = c.env.INVOICE_MANAGER.idFromName(companyId);
  const manager = c.env.INVOICE_MANAGER.get(id);
  return manager.fetch(c.req.raw);
});

// Spreadsheet upload routes
app.post('/api/upload/spreadsheet', async (c) => {
  const { companyId, file } = await c.req.parseBody();
  
  if (!(file instanceof File)) {
    return c.json({ error: 'No file provided' }, 400);
  }

  const key = `${companyId}/${Date.now()}-${file.name}`;
  await c.env.SPREADSHEET_UPLOADS.put(key, file.stream());

  return c.json({ 
    success: true, 
    key,
    name: file.name,
    size: file.size,
  });
});

app.get('/api/upload/spreadsheet/:key', async (c) => {
  const key = c.req.param('key');
  const object = await c.env.SPREADSHEET_UPLOADS.get(key);

  if (!object) {
    return c.json({ error: 'File not found' }, 404);
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${key.split('/').pop()}"`,
    },
  });
});

export default app;
