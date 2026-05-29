import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

type ReviewRecord = {
  transactionId: string;
  approved: boolean;
  reviewedAt: string;
};

const app = new Hono();

const reviews = ((globalThis as any).BOOKKEEPING_REVIEWS ??= []) as ReviewRecord[];

const reviewSchema = z.object({
  transactionId: z.string(),
  approved: z.boolean(),
});

app.post('/review', zValidator('json', reviewSchema), async (c) => {
  const { transactionId, approved } = c.req.valid('json');
  const existing = reviews.find((record) => record.transactionId === transactionId);

  if (existing) {
    existing.approved = approved;
    existing.reviewedAt = new Date().toISOString();
    return c.json({ success: true, review: existing });
  }

  const review = {
    transactionId,
    approved,
    reviewedAt: new Date().toISOString(),
  };

  reviews.push(review);
  return c.json({ success: true, review });
});

export default app;
