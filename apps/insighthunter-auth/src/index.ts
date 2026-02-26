
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCookie, setCookie } from 'hono/cookie';
import { jwt } from 'hono/jwt';
import bcrypt from 'bcryptjs';

// --- TYPE DEFINITIONS ---
interface Env {
  USERS: D1Database;
  // The SESSIONS KV is no longer needed with stateless JWT cookies
  // SESSIONS: KVNamespace; 
  JWT_SECRET: string;
}

interface User {
  id: number;
  email: string;
  password: string;
  role: string;
  plan: string;
}

interface JwtPayload {
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

// --- PUBLIC API ROUTES ---

app.post('/api/signup', async (c) => {
  try {
    const body = await c.req.formData();
    const email = body.get('email');
    const password = body.get('password');
    const role = body.get('role');
    const plan = body.get('plan') || 'free';

    if (typeof email !== 'string' || typeof password !== 'string' || typeof role !== 'string') {
      return c.json({ success: false, error: 'Email, password, and role are required' }, 400);
    }
    if (password.length < 12) {
      return c.json({ success: false, error: 'Password must be at least 12 characters' }, 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await c.env.USERS.prepare(
        'INSERT INTO users (email, password, role, plan, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(email, hashedPassword, role, plan, new Date().toISOString()).run();

    // After signup, we log the user in directly
    return c.redirect('https://insighthunter.app/login.html', 302);

  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed')) {
      return c.json({ success: false, error: 'A user with this email already exists' }, 409);
    }
    console.error('Signup Error:', e);
    return c.json({ success: false, error: 'An internal error occurred during signup' }, 500);
  }
});

app.post('/api/login', async (c) => {
    const { email, password } = await c.req.json();

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
    
    const sevenDays = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7);
    const payload: JwtPayload = { userId: user.id, role: user.role, exp: sevenDays };
    const token = await jwt.sign(payload, c.env.JWT_SECRET);
    
    // Set the JWT directly in a secure, HttpOnly cookie
    setCookie(c, 'auth_token', token, {
        path: '/',
        secure: true, // Always true in production
        httpOnly: true,
        sameSite: 'Lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return c.redirect('https://insighthunter.app/dashboard.html', 302);
});

// --- PROTECTED SESSION VALIDATION ROUTE ---

/**
 * Validates the auth_token cookie sent by a browser.
 * This is called by the main API gateway to authenticate requests.
 */
app.get('/api/validate-session', async (c) => {
    // 1. Get the auth_token from the cookie
    const token = getCookie(c, 'auth_token');
    if (!token) {
        return c.json({ success: false, error: 'No auth token provided.' }, 401);
    }

    // 2. Verify the JWT
    try {
        const payload = await jwt.verify(token, c.env.JWT_SECRET) as JwtPayload;
        
        // 3. Respond with success and the user info
        return c.json({ success: true, userId: payload.userId, role: payload.role });

    } catch (e) {
        // This catches expired tokens or invalid signatures
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
