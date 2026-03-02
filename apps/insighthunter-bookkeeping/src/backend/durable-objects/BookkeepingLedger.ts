import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../index';
import type { Report } from '../../types/reports';

export class BookkeepingLedger extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async getReports(): Promise<Response> {
    try {
      const { results } = await this.ctx.env.DB.prepare(
        'SELECT * FROM reports'
      ).all();
      return new Response(JSON.stringify(results), { status: 200 });
    } catch (e) {
      return new Response(e.message, { status: 500 });
    }
  }

  async createReport(request: Request): Promise<Response> {
    try {
      const { title, client } = await request.json();
      const { results } = await this.ctx.env.DB.prepare(
        'INSERT INTO reports (title, client, status, createdAt) VALUES (?, ?, ?, ?) RETURNING *'
      )
        .bind(title, client, 'Queued', new Date().toISOString())
        .all();
      return new Response(JSON.stringify(results[0]), { status: 201 });
    } catch (e) {
      return new Response(e.message, { status: 500 });
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.slice(1);

    switch (path) {
      case 'reports':
        if (request.method === 'GET') {
          return this.getReports();
        } else if (request.method === 'POST') {
          return this.createReport(request);
        }
        break;
      default:
        return new Response('Not Found', { status: 404 });
    }
    return new Response('Method Not Allowed', { status: 405 });
  }
}
