export function corsHeaders(origin: string | null, allowedOrigins: string): Record<string, string> {
    const origins = allowedOrigins.split(',').map(o => o.trim());
    const allowed = origins.includes('*') || (origin && origins.includes(origin))
      ? (origin ?? '*')
      : origins[0];
  
    return {
      'Access-Control-Allow-Origin':  allowed,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Org-ID',
      'Access-Control-Max-Age':       '86400',
    };
  }
  
  export function handleCors(request: Request, allowedOrigins: string): Response | null {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request.headers.get('Origin'), allowedOrigins),
      });
    }
    return null;
  }
  