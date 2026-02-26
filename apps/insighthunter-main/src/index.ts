
import { Hono } from 'hono';
import { cors } from 'hono/cors';

// --- ENV BINDINGS ---
export interface Env {
  // Services
  AUTH_SERVICE: Fetcher;
  BOOKKEEPING_SERVICE: Fetcher;
  
  // Durable Objects
  RATE_LIMITER: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: Env }>();

// --- MIDDLEWARE ---

// Apply CORS to all requests
app.use('*', cors({
  origin: (origin) => origin,
  credentials: true,
}));

// Rate Limiting Middleware
app.use('*', async (c, next) => {
  // CORRECTED: Consistently use c.req.header() for lookups
  const userId = c.req.header('X-Authenticated-User-Id') || c.req.header('CF-Connecting-IP');
  if (!userId) { 
    // This should ideally not happen if gateway is configured correctly
    return c.json({ error: 'Could not identify user for rate limiting' }, 400); 
  }

  const id = c.env.RATE_LIMITER.idFromName(userId);
  const limiter = c.env.RATE_LIMITER.get(id);
  
  const response = await limiter.fetch(c.req.raw);
  
  if (response.status === 429) {
    return new Response('Too many requests', { status: 429 });
  }
  
  await next();
});


// --- ROUTING LOGIC ---

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Default catch-all to proxy to the correct service
// The gateway should have already performed authentication
app.all('*', async (c) => {
  const path = new URL(c.req.url).pathname;
  const userId = c.req.header('X-Authenticated-User-Id');

  // Create a new request to forward, including the authenticated user ID
  const newRequest = new Request(c.req.raw);
  if (userId) {
    newRequest.headers.set('X-Authenticated-User-Id', userId);
  }

  // --- Service Routing ---
  if (path.startsWith('/api/ledger') || path.startsWith('/api/invoices') || path.startsWith('/api/bank')) {
    console.log(`Proxying to BOOKKEEPING_SERVICE: ${path}`)
    return c.env.BOOKKEEPING_SERVICE.fetch(newRequest);
  }

  if (path.startsWith('/api/subscriptions') || path.startsWith('/api/webhooks/stripe')) {
    console.log(`Proxying to BOOKKEEPING_SERVICE: ${path}`)
    return c.env.BOOKKEEPING_SERVICE.fetch(newRequest);
  }

  console.log(`No route matched for path: ${path}. Defaulting to not found.`);
  return c.json({ error: 'Not Found' }, 404);
});


// --- ERROR HANDLING ---

app.onError((err, c) => {
  console.error(`Error in main worker: ${err}`)
  return c.json({ error: 'Internal Server Error' }, 500)
});

app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404)
});

export default app;
