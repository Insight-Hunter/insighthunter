import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

type QueueItem = {
  queueItemId: string;
  accountId: string;
  status: 'pending' | 'approved';
  createdAt: string;
  approvedAt?: string;
};

const app = new Hono();

const queue = ((globalThis as any).BOOKKEEPING_QUEUE ??= []) as QueueItem[];

const approveSchema = z.object({
  queueItemId: z.string(),
  accountId: z.string(),
});

app.get('/queue', async (c) => {
  return c.json(queue.filter((item) => item.status === 'pending'));
});

app.post('/approve', zValidator('json', approveSchema), async (c) => {
  const { queueItemId, accountId } = c.req.valid('json');
  const item = queue.find(
    (entry) => entry.queueItemId === queueItemId && entry.accountId === accountId
  );

  if (!item) {
    return c.json({ error: 'Queue item not found' }, 404);
  }

  item.status = 'approved';
  item.approvedAt = new Date().toISOString();

  return c.json({ success: true, item });
});

export default app;
