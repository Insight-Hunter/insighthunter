
// apps/insighthunter-main/functions/api/[[path]].js

/**
 * This is the main API gateway for the entire application.
 * Its primary job is to act as a router and security checkpoint, forwarding
 * incoming requests to the correct backend service.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // --- 1. PUBLIC ROUTES ---
    // These paths are accessible without authentication.
    if (pathname.startsWith('/api/login') || pathname.startsWith('/api/signup')) {
      return env.AUTH_SERVICE.fetch(request);
    }
    if (pathname.startsWith('/api/webhooks/stripe')) {
      return env.BOOKKEEPING_SERVICE.fetch(request);
    }

    // --- 2. SESSION VALIDATION ---
    // For all other routes, we must validate the user's session.
    // We do this by calling our new '/api/validate-session' endpoint in the auth service.
    const validationUrl = new URL(url);
    validationUrl.pathname = '/api/validate-session';

    const validationRequest = new Request(validationUrl, {
        headers: { 'Cookie': request.headers.get('Cookie') || '' }
    });

    const validationResponse = await env.AUTH_SERVICE.fetch(validationRequest);

    // If the auth service says the session is invalid, deny access.
    if (!validationResponse.ok) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // --- 3. PROXY TO BACKEND SERVICE ---
    // If the session is valid, we add the user ID to the request header
    // and forward it to the appropriate backend service.
    const authResult = await validationResponse.json();
    const userId = authResult.userId;

    const newRequest = new Request(request);
    newRequest.headers.set('X-Authenticated-User-Id', userId);
    
    // Currently, all other logic is in the bookkeeping service.
    return env.BOOKKEEPING_SERVICE.fetch(newRequest);
  },
};
