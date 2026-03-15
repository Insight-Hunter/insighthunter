import { DurableObject } from 'cloudflare:workers';
import type { Env, FormationStatus } from '../types';

export class FormationAgent extends DurableObject<Env> {
  private state: DurableObjectState;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url    = new URL(request.url);
    const action = url.pathname.replace('/', '');

    if (action === 'init' && request.method === 'POST') {
      const { caseId, orgId } = await request.json<any>();
      await this.state.storage.put('caseId', caseId);
      await this.state.storage.put('orgId',  orgId);
      await this.state.storage.put('status', 'QUESTIONNAIRE' as FormationStatus);
      return Response.json({ ok: true });
    }

    if (action === 'advance' && request.method === 'POST') {
      const { nextStatus } = await request.json<{ nextStatus: FormationStatus }>();
      await this.state.storage.put('status', nextStatus);
      return Response.json({ status: nextStatus });
    }

    if (action === 'status') {
      const status = await this.state.storage.get<FormationStatus>('status');
      return Response.json({ status });
    }

    return new Response('Not found', { status: 404 });
  }
}
