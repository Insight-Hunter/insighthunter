import { Hono } from 'hono';
import review from './review';
import ai from './ai';
import forecast from './forecast';

const app = new Hono();

app.route('/review', review);
app.route('/ai', ai);
app.route('/forecast', forecast);

export default app;
