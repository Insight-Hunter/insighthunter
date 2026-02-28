// apps/insighthunter-main/src/index.ts
import type { Env } from './types';

// ─── Route config ──────────────────────────────────────────────────────────

/** Clean URL aliases → actual static file */
const CLEAN_ROUTES: Record<string, string> = {
  '/':               '/index.html',
  '/features':       '/features.html',
  '/features/lite':           '/features/lite.html',
  '/features/standard':       '/features/standard.html',
  '/features/pro':            '/features/pro.html',
  '/features/pbx':            '/features/pbx.html',
  '/features/bookkeeping':    '/features/bookkeeping.html',
  '/features/payroll':        '/features/payroll.html',
  '/features/scout':          '/features/scout.html',
  '/features/bizforma':       '/features/bizforma.html',
  '/features/website-services': '/features/website-services.html',
  '/dashboard':       '/dashboard.html',
  '/login':           '/login.html',
  '/signup':          '/signup.html',
  '/shop':            '/shop.html',
  '/pricing':         '/pricing.html',
  '/checkout':        '/checkout.html',
  '/checkout/success':'/checkout-success.html',
  '/docs':            '/docs.html',
  '/support':         '/support.html',
  '/admin':           '/admin.html',
  '/compliance':      '/compliance.html',
  '/settings':        '/settings.html',
  '/reports':         '/reports.html',
  '/clients':         '/clients.html',
  '/bookkeeping':     '/bookkeeping.html',
  '/reconciliation':  '/reconciliation.html',
  '/my-account':      '/my-account.html',
  '/about':           '/about.html',
  '/blog':            '/marketing/blog/index.html',
  '/privacy':         '/marketing/legal/privacy.html',
  '/terms':           '/marketing/legal/terms.html',
};

/** Paths that require an active session — redirect to /login if not authed */
const PROTECTED_PATHS = new Set([
  '/dashboard',
  '/dashboard.html',
  '/settings',
  '/settings.html',
  '/reports',
  '/reports.html',
  '/clients',
  '/clients.html',
  '/bookkeeping',
  '/bookkeeping.html',
  '/reconciliation',
  '/reconciliation.html',
  '/my-account',
  '/my-account.html',
  '/admin',
  '/admin.html',
  '/admin-compliance.html',
  '/compliance',
  '/compliance.html',
  '/checkout',
  '/checkout.html',
]);

/** Permanent redirects (301) */
const REDIRECTS_301: Record<string, string> = {
  '/insight-lite':     '/features/lite',
  '/insight-standard': '/features/standard',
  '/insight-pro':      '/features/pro',
  '/home':             '/',
};

/** Temporary redirects (302) */
const REDIRECTS_302: Record<string, string> = {
  '/app':     '/dashboard',
  '/billing': '/shop',
  '/plans':   '/shop',
};

// ─── Security headers applied to every HTML response ──────────────────────
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options':           'SAMEORIGIN',
  'X-Content-Type-Options':    'nosniff',
  'Referrer-Policy':           'strict-origin-when-cross-origin',
  'Permissions-Policy':        'camera=(), microphone=(), geolocation=()',
  'X-XSS-Protection':          '1; mode=block',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://cdn.plaid.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.insighthunter.app https://api.stripe.com https://production.plaid.com",
    "frame-src https://js.stripe.com https://cdn.plaid.com",
  ].join('; '),
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function addSecurityHeaders(response: Response): Response {
  const res = new Response(response.body, response);
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

function redirect(location: string, status: 301 | 302 = 302): Response {
  return new Response(null, {
    status,
    headers: { Location: location },
  });
}

function isHtmlRequest(request: Request): boolean {
  return request.headers.get('Accept')?.includes('text/html') ?? false;
}

function hasSessionCookie(request: Request): boolean {
  const cookie = request.headers.get('Cookie') ?? '';
  return cookie.includes('ih_token=') || cookie.includes('ih_session=');
}

function notFound(): Response {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>404 – Page Not Found · Insight Hunter</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0d2f23;color:#f0fdf4;font-family:Inter,sans-serif;text-align:center;flex-direction:column;gap:1rem;">
  <div style="font-size:4rem;">🔍</div>
  <h1 style="font-size:2.5rem;font-weight:800;">404</h1>
  <p style="color:#a7f3d0;font-size:1.1rem;">That page doesn't exist or has moved.</p>
  <a href="/" style="margin-top:1rem;padding:.9rem 2rem;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:50px;font-weight:600;text-decoration:none;">
    ← Back to Home
  </a>
</body>
</html>`,
    {
      status: 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        ...SECURITY_HEADERS,
      },
    }
  );
}

// ─── Main fetch handler ────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url      = new URL(request.url);
    let   pathname = url.pathname.replace(/\/+$/, '') || '/'; // strip trailing slash

    // ── 1. API routes → handled by Pages Functions (never reach here)
    //    Pages Functions intercepts /api/* before the Worker.
    //    This block is a safety net for local dev edge cases.
    if (pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({ error: 'API route not handled by static worker' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 2. Permanent redirects (301)
    if (REDIRECTS_301[pathname]) {
      return redirect(REDIRECTS_301[pathname], 301);
    }

    // ── 3. Temporary redirects (302)
    if (REDIRECTS_302[pathname]) {
      return redirect(REDIRECTS_302[pathname], 302);
    }

    // ── 4. Auth guard — redirect unauthenticated users to /login
    if (PROTECTED_PATHS.has(pathname)) {
      if (!hasSessionCookie(request)) {
        const loginUrl = new URL('/login', url.origin);
        loginUrl.searchParams.set('redirect', pathname);
        return redirect(loginUrl.toString(), 302);
      }
    }

    // ── 5. Clean URL resolution → map to actual .html file
    const resolvedPath = CLEAN_ROUTES[pathname];
    if (resolvedPath) {
      const assetUrl     = new URL(resolvedPath, url.origin);
      const assetRequest = new Request(assetUrl.toString(), request);
      try {
        const assetResponse = await env.ASSETS.fetch(assetRequest);
        if (assetResponse.ok) {
          return addSecurityHeaders(assetResponse);
        }
      } catch {
        // fall through to direct asset fetch below
      }
    }

    // ── 6. Direct static asset fetch (CSS, JS, images, fonts, etc.)
    try {
      const assetResponse = await env.ASSETS.fetch(request);

      if (assetResponse.status === 404 && isHtmlRequest(request)) {
        return notFound();
      }

      // Add security headers only to HTML responses
      const contentType = assetResponse.headers.get('Content-Type') ?? '';
      if (contentType.includes('text/html')) {
        return addSecurityHeaders(assetResponse);
      }

      // Static assets (CSS/JS/images) — add cache headers
      const res = new Response(assetResponse.body, assetResponse);
      if (
        pathname.match(/\.(css|js|woff2?|ttf|otf|eot|svg|png|jpg|jpeg|gif|ico|webp)$/)
      ) {
        res.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
      return res;

    } catch (err) {
      console.error('[static-fetch]', pathname, err);

      // SPA fallback — if asset not found, serve index.html for client routing
      if (isHtmlRequest(request)) {
        try {
          const fallback = await env.ASSETS.fetch(
            new Request(new URL('/index.html', url.origin).toString(), request)
          );
          return addSecurityHeaders(fallback);
        } catch {
          return notFound();
        }
      }

      return new Response('Not Found', { status: 404 });
    }
  },
} satisfies ExportedHandler<Env>;
