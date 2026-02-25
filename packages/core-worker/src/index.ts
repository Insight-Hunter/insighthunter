export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/signup') {
      return handleSignup(request, env);
    } else {
      return new Response('Not found', { status: 404 });
    }
  },
};

async function handleSignup(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { name, email, password, 'cf-turnstile-response': turnstileResponse } = await request.json();

    const turnstileSecretKey = 'YOUR_TURNSTILE_SECRET_KEY';

    const turnstileVerificationResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: turnstileSecretKey,
        response: turnstileResponse,
      }),
    });

    const turnstileVerificationData = await turnstileVerificationResponse.json();

    if (!turnstileVerificationData.success) {
      return new Response(JSON.stringify({ success: false, error: 'CAPTCHA verification failed.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // TODO: Add your user creation logic here (e.g., save the user to a database)

    // For now, we'll just return a success response with a dummy token
    return new Response(JSON.stringify({ success: true, token: 'dummy-token' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Signup failed:', error);
    return new Response(JSON.stringify({ success: false, error: 'An unknown error occurred.' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}

interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  //
  // Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
  // MY_SERVICE: Fetcher;
  //
  // Example binding to a Queue. Learn more at https://developers.cloudflare.com/workers/runtime-apis/queues/
  // MY_QUEUE: Queue;
}
