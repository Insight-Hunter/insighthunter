// apps/insighthunter-main/functions/api/[[path]].js

const routePermissions = {
    '/api/ledger': 'bookkeeping',
    '/api/invoices': 'bookkeeping',
    '/api/bank': 'bookkeeping',
    '/api/upload': 'bookkeeping',
};

function getRequiredPermission(pathname) {
    for (const route in routePermissions) {
        if (pathname.startsWith(route)) {
            return routePermissions[route];
        }
    }
    return null;
}

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const pathname = url.pathname;

    // --- Public Routes: Forward to the correct service ---
    if (pathname.startsWith('/api/login') || pathname.startsWith('/api/signup')) {
        return env.AUTH_SERVICE.fetch(request);
    }
    if (pathname.startsWith('/api/webhooks/stripe')) {
        return env.BOOKKEEPING_SERVICE.fetch(request);
    }

    // --- Authentication: All other routes are protected ---
    const authHeader = request.headers.get('Authorization');
    const token = authHeader ? authHeader.split(' ')[1] : null;

    if (!token) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized: No token provided' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    let userId;
    try {
        const authServiceUrl = new URL(request.url);
        authServiceUrl.pathname = '/api/validate-token';

        // Call the NEW central auth service to validate the token.
        const authResponse = await env.AUTH_SERVICE.fetch(new Request(authServiceUrl, {
            headers: request.headers,
        }));

        const authResult = await authResponse.json();
        if (!authResult.success) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Invalid token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        userId = authResult.userId;
    } catch (error) {
        console.error('Error during token validation:', error);
        return new Response(JSON.stringify({ success: false, error: 'Internal Server Error during authentication' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // --- Authorization ---
    const requiredPermission = getRequiredPermission(pathname);

    if (requiredPermission) {
        try {
            const doId = env.SUBSCRIPTION_MANAGER.idFromName(userId);
            const subscriptionManager = env.SUBSCRIPTION_MANAGER.get(doId);

            const subServiceUrl = new URL(request.url);
            subServiceUrl.pathname = `/api/subscriptions/${userId}`;
            const subscriptionResponse = await subscriptionManager.fetch(new Request(subServiceUrl));

            if (!subscriptionResponse.ok) {
                return new Response(JSON.stringify({ success: false, error: 'Forbidden: Could not verify subscription status' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
            }

            const subscription = await subscriptionResponse.json();

            if (subscription.status !== 'active' || !subscription.planId || !subscription.planId.includes(requiredPermission)) {
                return new Response(JSON.stringify({ success: false, error: 'Forbidden: Your current plan does not grant access to this feature.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
            }
        } catch (error) {
            console.error('Error during subscription verification:', error);
            return new Response(JSON.stringify({ success: false, error: 'Internal Server Error during authorization' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    }

    // --- Proxy Request ---
    const newRequest = new Request(request);
    newRequest.headers.set('X-Authenticated-User-Id', userId);

    // Forward to the bookkeeping service (as it handles all other backend logic for now)
    return env.BOOKKEEPING_SERVICE.fetch(newRequest);
}
