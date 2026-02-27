
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCookie, setCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import bcrypt from 'bcryptjs';
import type { Context } from 'hono';

// --- TYPE DEFINITIONS ---
interface Env {
  USERS: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
}

interface User {
  id: number;
  email: string;
  password: string;
  role: string;
  plan: string;
}

// CORRECTED: Add index signature to JwtPayload interface
interface JwtPayload {
  [key: string]: any;
  userId: number;
  role: string;
  exp: number; // Expiration time
}

const app = new Hono<{ Bindings: Env }>();

// --- MIDDLEWARE ---
app.use('*', cors({
  origin: (origin) => origin,
  credentials: true,
}));

// --- UTILITY ---
const createSession = async (c: Context<{ Bindings: Env }>, user: { id: number; role: string }) => {
    if (!c.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable not configured');
    }
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);

    const sevenDays = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7);
    const payload: JwtPayload = { userId: user.id, role: user.role, exp: sevenDays };
    const token = await sign(payload, secret);

    const sessionId = crypto.randomUUID();
    await c.env.SESSIONS.put(`session:${sessionId}`, JSON.stringify({ userId: user.id, token }), { expirationTtl: 60 * 60 * 24 * 7 });

    setCookie(c, 'session_id', sessionId, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'Lax',
        maxAge: 60 * 60 * 24 * 7,
    });
}

// --- PUBLIC API ROUTES ---

app.post('/api/signup', async (c) => {
  try {
    const body = await c.req.formData();
    const email = body.get('email') as string;
    const password = body.get('password') as string;
    const role = body.get('role') as string;
    const plan = (body.get('plan') as string) || 'free';

    if (!email || !password || !role) {
      return c.json({ success: false, error: 'Email, password, and role are required' }, 400);
    }
    if (password.length < 12) {
      return c.json({ success: false, error: 'Password must be at least 12 characters' }, 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await c.env.USERS.prepare(
        'INSERT INTO users (email, password, role, plan, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(email, hashedPassword, role, plan, new Date().toISOString()).run();

    const newUser = await c.env.USERS.prepare('SELECT id, role FROM users WHERE email = ?').bind(email).first<User>();
    if (!newUser) {
        return c.json({ success: false, error: 'Failed to retrieve user after creation.' }, 500);
    }

    await createSession(c, newUser);

    return c.redirect('https://insighthunter.app/dashboard.html', 302);

  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed')) {
      return c.json({ success: false, error: 'A user with this email already exists' }, 409);
    }
    console.error('Signup Error:', e);
    return c.json({ success: false, error: 'An internal error occurred during signup' }, 500);
  }
});

app.post('/api/login', async (c) => {
    const body = await c.req.formData();
    const email = body.get('email') as string;
    const password = body.get('password') as string;

    if (!email || !password) {
        return c.json({ success: false, error: 'Email and password are required' }, 400);
    }

    const user = await c.env.USERS.prepare('SELECT id, password, role FROM users WHERE email = ?').bind(email).first<User>();

    if (!user) {
        return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    const passwordIsValid = await bcrypt.compare(password, user.password);
    if (!passwordIsValid) {
        return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }
    
    await createSession(c, user);

    return c.redirect('https://insighthunter.app/dashboard.html', 302);
});

// --- SESSION VALIDATION ROUTE ---

app.get('/api/validate-session', async (c) => {
    if (!c.env.JWT_SECRET) {
        console.error('JWT_SECRET not configured');
        return c.json({ success: false, error: 'Internal server configuration error.' }, 500);
    }

    const sessionId = getCookie(c, 'session_id');
    if (!sessionId) {
        return c.json({ success: false, error: 'No session cookie provided.' }, 401);
    }

    const sessionData = await c.env.SESSIONS.get(`session:${sessionId}`);
    if (!sessionData) {
        return c.json({ success: false, error: 'Invalid or expired session.' }, 401);
    }

    const { token } = JSON.parse(sessionData);
    if (!token) {
        return c.json({ success: false, error: 'No token found in session.' }, 401);
    }

    try {
        const secret = new TextEncoder().encode(c.env.JWT_SECRET);
        const payload = await verify(token, secret) as JwtPayload;
        return c.json({ success: true, userId: payload.userId, role: payload.role });

    } catch (e) {
        console.error('JWT Verification Error:', e);
        return c.json({ success: false, error: 'Invalid or expired token.' }, 401);
    }
});

// --- GENERIC HANDLERS ---

app.onError((err, c) => {
  console.error(`Hono Error: ${err}`);
  return c.json({ success: false, error: 'Internal Server Error' }, 500);
});

app.notFound((c) => {
  return c.json({ success: false, error: 'Not Found' }, 404);
});

export default app;
