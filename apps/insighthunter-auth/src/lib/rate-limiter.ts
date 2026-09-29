export class RateLimiter {
  state: DurableObjectState;
  private readonly WINDOW_MS = 15 * 60 * 1000;
  private readonly MAX_ATTEMPTS = 8;

  constructor(state: DurableObjectState) { this.state = state; }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const now = Date.now();
    const record = (await this.state.storage.get<{ count: number; windowStart: number }>('record')) ?? { count: 0, windowStart: now };

    if (now - record.windowStart > this.WINDOW_MS) { record.count = 0; record.windowStart = now; }

    if (url.pathname === '/check') {
      return record.count >= this.MAX_ATTEMPTS ? new Response('rate_limited', { status: 429 }) : new Response('ok', { status: 200 });
    }
    if (url.pathname === '/record-failure') {
      record.count += 1;
      await this.state.storage.put('record', record);
      return new Response('recorded', { status: 200 });
    }
    return new Response('not_found', { status: 404 });
  }
}
