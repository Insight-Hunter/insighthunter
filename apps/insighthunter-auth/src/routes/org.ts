import { Hono } from 'hono';
import type { Env } from '../types/env';

export const orgRoutes = new Hono<{ Bindings: Env }>();