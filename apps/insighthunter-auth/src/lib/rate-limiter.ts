import { DurableObject } from 'cloudflare:workers';

interface RateLimiterState {
  failures: number;
  windowStart: number;
}

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILURES = 8;

export class RateLimiter extends DurableObject {
  private state: RateLimiterState = { failures: 0, windowStart: Date.now() };
  private initialized = false;

  async fetch(request: Request): Promise<Response> {
    if (!this.initialized) {
      const stored = await this.ctx.storage.get<RateLimiterState>('state');
      if (stored) this.state = stored;
      this.initialized = true;
    }

    const url = new URL(request.url);
    const now = Date.now();

    // Reset window if expired
    if (now - this.state.windowStart > WINDOW_MS) {
      this.state = { failures: 0, windowStart: now };
      await this.ctx.storage.put('state', this.state);
    }

    if (url.pathname === '/check') {
      if (this.state.failures >= MAX_FAILURES) {
        const remaining = Math.ceil((this.state.windowStart + WINDOW_MS - now) / 1000);
        return new Response(JSON.stringify({ blocked: true }), {
          status: 429,
          headers: { 'Retry-After': String(remaining), 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ blocked: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (url.pathname === '/record-failure' && request.method === 'POST') {
      this.state.failures += 1;
      await this.ctx.storage.put('state', this.state);
      return new Response(null, { status: 204 });
    }

    if (url.pathname === '/reset' && request.method === 'POST') {
      this.state = { failures: 0, windowStart: Date.now() };
      await this.ctx.storage.put('state', this.state);
      return new Response(null, { status: 204 });
    }

    return new Response('not found', { status: 404 });
  }
}
