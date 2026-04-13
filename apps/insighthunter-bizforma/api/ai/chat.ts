import { Hono } from 'hono';
export const chatApi = new Hono();
chatApi.post('/', async (c) => {
  const body = await c.req.json<{ message: string }>();
  const result = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', { prompt: `You are BizForma advisor. Answer succinctly: ${body.message}` });
  return c.json({ result });
});
