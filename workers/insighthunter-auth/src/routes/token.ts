import { Hono } from 'hono';
import type { Env } from '../types/env';

export const tokenRoutes = new Hono<{ Bindings: Env }>();