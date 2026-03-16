import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types';

interface FormationState {
  id: string;
  lastStatus: string;
  updatedAt: string;
}

export class FormationAgent extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/state')) {
      const state = (await this.ctx.storage.get<FormationState>('state')) ?? null;
      return Response.json(state);
    }

    return new Response('Not found', { status: 404 });
  }
}
