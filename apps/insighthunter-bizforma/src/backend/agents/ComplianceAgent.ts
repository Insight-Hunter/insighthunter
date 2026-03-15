import { DurableObject } from 'cloudflare:workers';
import type { Env }      from '../types';

export class ComplianceAgent extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url    = new URL(request.url);
    const action = url.pathname.replace('/', '');

    if (action === 'schedule' && request.method === 'POST') {
      const { eventId, orgId, caseId, dueDate } = await request.json<any>();
      // Schedule alarm 7 days before due date
      const alarmTime = new Date(dueDate).getTime() - 7 * 24 * 60 * 60 * 1000;
      await this.ctx.storage.setAlarm(alarmTime);
      await this.ctx.storage.put(`event:${eventId}`, { eventId, orgId, caseId, dueDate });
      return Response.json({ scheduled: true });
    }

    return new Response('Not found', { status: 404 });
  }

  async alarm(): Promise<void> {
    const all = await this.ctx.storage.list<any>({ prefix: 'event:' });
    for (const [key, event] of all) {
      await this.env.REMINDER_QUEUE.send({
        orgId:        event.orgId,
        caseId:       event.caseId,
        eventId:      event.eventId,
        reminderType: 'email',
      });
    }
  }
}
