// src/backend/durable-objects/BookkeepingLedger.ts
import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../index';

export class BookkeepingLedger extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    return new Response('Not Found', { status: 404 });
  }
}
