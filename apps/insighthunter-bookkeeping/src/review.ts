import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono();

const reviewSchema = z.object({
  transactionId: z.string(),
  approved: z.boolean(),
});

app.post('/review', zValidator('json', reviewSchema), async (c) => {
  const { transactionId, approved } = c.req.valid('json');

  // TODO: Implement the logic to update the transaction in the database

  return c.json({ success: true });
});

export default app;
