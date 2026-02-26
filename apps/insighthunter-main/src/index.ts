// apps/insighthunter-main/src/index.ts - COMPLETE FILE
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';

interface Env {
  ASSETS: Fetcher;
  USERS: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  AUTH_API_URL: string;
}

const app = new Hono<{ Bindings: Env }>();

// ⭐ THIS IS THE STATIC FILE HANDLER - PUT IT FIRST ⭐
app.get('/*', async (c) => {
  const url = new URL(c.req.url);
  const pathname = url.pathname;
  
  console.log('Serving:', pathname); // Debug log
  
  // 1. Serve HTML/CSS/JS/images from public/ folder
  if (pathname.match(/\.(html|css|js|png|jpg|jpeg|ico|svg|woff2?|ttf)$/)) {
    return c.env.ASSETS.fetch(c.req);
  }
  
  // 2. Root "/" → redirect to shop.html
  if (pathname === '/' || pathname === '') {
    return Response.redirect('/shop.html', 302);
  }
  
  // 3. API routes below this line will override
  return c.text('Not Found', 404);
});

// ⭐ API ROUTES - These come AFTER static handler ⭐

// Enable CORS for API
app.use('/api/*', cors({
  origin: ['https://app.insighthunter.com', 'http://localhost:8787'],
  credentials: true,
}));

// Proxy ALL /api/* to auth worker (signup, login, etc.)
app.all('/api/*', async (c) => {
  const targetUrl = new URL(c.req.url.replace(c.req.url.split('/api')[0], c.env.AUTH_API_URL));
  console.log('Proxying to:', targetUrl.toString());
  
  const proxyReq = new Request(targetUrl, {
    method: c.req.method,
    headers: c.req.headers,
    body: c.req.body,
  });
  
  const response = await fetch(proxyReq);
  
  // Forward auth cookies/JWT
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Access-Control-Allow-Origin', 'https://app.insighthunter.com');
  newResponse.headers.set('Access-Control-Allow-Credentials', 'true');
  
  return newResponse;
});

// Protected dashboard (after auth proxy)
app.get('/dashboard', jwt({ secret: c.env.JWT_SECRET }), async (c) => {
  const payload = c.get('jwtPayload') as { userId: string };
  // Query user data from D1
  return c.json({ 
    success: true, 
    message: 'Welcome to dashboard!',
    userId: payload.userId 
  });
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

export default app;
