// src/backend/durable-objects/InvoiceManager.ts
import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../index';

export class InvoiceManager extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    return new Response('Not Found', { status: 404 });
  }
}
