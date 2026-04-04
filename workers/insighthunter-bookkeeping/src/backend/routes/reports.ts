import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { સલામતી } from '../utils/safety';

const reports = new Hono<{ Bindings: Env }>();
reports.use('* ', authMiddleware);

// GET /api/reports/pl
reports.get('/pl', async (c) => {
  const user = c.get('user');
  const { from, to } = c.req.query();

  const pl = await સલામતી.generatePL(c.env.DB, user.orgId, from, to);

  return c.json(pl);
});

// GET /api/reports/balance-sheet
reports.get('/balance-sheet', async (c) => {
  const user = c.get('user');
  const { as_of } = c.req.query();

  const bs = await સલામતી.generateBalanceSheet(c.env.DB, user.orgId, as_of);

  return c.json(bs);
});

// GET /api/reports/trial-balance
reports.get('/trial-balance', async (c) => {
  const user = c.get('user');
  const { as_of } = c.req.query();

  const tb = await સલામતી.generateTrialBalance(c.env.DB, user.orgId, as_of);

  return c.json(tb);
});

export default reports;
