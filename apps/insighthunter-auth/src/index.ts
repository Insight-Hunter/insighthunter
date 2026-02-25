import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt, sign } from 'hono/jwt';

// Define the environment bindings that will be available to the worker.
export interface Env {
  DB: D1Database;
  LITE_APP_URL: string;
  JWT_SECRET: string; // Secret for signing JWTs
}

const app = new Hono<{ Bindings: Env }>();

// Allow cross-origin requests from specific domains.
app.use('*', cors({
  origin: ['https://insighthunter.app', 'https://lite.insighthunter.app'],
  credentials: true,
}));

// --- Cryptography Helper Functions ---

/**
 * Hashes a password using PBKDF2-SHA256. A random 16-byte salt is generated for each hash.
 * @param password The clear-text password to hash.
 * @returns A promise that resolves to a string containing the salt and hash, encoded for storage.
 */
async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const passwordBuffer = new TextEncoder().encode(password);
    
    const key = await crypto.subtle.importKey('raw', passwordBuffer, { name: 'PBKDF2' }, false, ['deriveBits']);
    
    const hashBuffer = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        key,
        256 // 256 bits
    );

    const saltHex = Array.from(new Uint8Array(salt)).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return saltHex + hashHex;
}

/**
 * Verifies a clear-text password against a stored PBKDF2 hash.
 * @param password The clear-text password to verify.
 * @param storedSaltAndHash The hex-encoded salt and hash from the database.
 * @returns A promise that resolves to true if the password is correct, and false otherwise.
 */
async function verifyPassword(password: string, storedSaltAndHash: string): Promise<boolean> {
    try {
        const salt = Uint8Array.from(storedSaltAndHash.substring(0, 32).match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        const storedHash = Uint8Array.from(storedSaltAndHash.substring(32).match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

        const passwordBuffer = new TextEncoder().encode(password);
        const key = await crypto.subtle.importKey('raw', passwordBuffer, { name: 'PBKDF2' }, false, ['deriveBits']);
        
        const derivedHashBuffer = await crypto.subtle.deriveBits(
            { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
            key,
            256
        );

        return crypto.subtle.timingSafeEqual(storedHash, new Uint8Array(derivedHashBuffer));
    } catch (e) {
        console.error("Error during password verification:", e);
        return false;
    }
}

// --- API Endpoints ---

/**
 * Endpoint for new user registration.
 */
app.post('/api/signup', async (c) => {
    const { name, email, password } = await c.req.json();

    if (!name || !email || !password) {
        return c.json({ success: false, error: 'Name, email, and password are required.' }, 400);
    }
    
    try {
        const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (existingUser) {
            return c.json({ success: false, error: 'User with this email already exists.' }, 409);
        }

        const hashedPassword = await hashPassword(password);
        
        const result = await c.env.DB.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
            .bind(name, email, hashedPassword)
            .run();

        if (!result.meta.last_row_id) {
            throw new Error("Failed to create user or retrieve user ID.");
        }
        
        const userId = result.meta.last_row_id;
        
        const payload = {
            sub: userId,
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24-hour expiration
        };
        const token = await sign(payload, c.env.JWT_SECRET);

        return c.json({ success: true, token: token });
    } catch (error) {
        console.error("Signup Error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return c.json({ success: false, error: 'An internal error occurred during signup.', details: errorMessage }, 500);
    }
});

/**
 * Endpoint for user login.
 */
app.post('/api/login', async (c) => {
    const { email, password } = await c.req.json();

    if (!email || !password) {
        return c.json({ success: false, error: 'Email and password are required.' }, 400);
    }

    try {
        const user = await c.env.DB.prepare('SELECT id, password_hash FROM users WHERE email = ?').bind(email).first<{ id: string; password_hash: string }>();
        
        if (!user) {
            return c.json({ success: false, error: 'Invalid credentials.' }, 401);
        }

        const passwordIsValid = await verifyPassword(password, user.password_hash);

        if (!passwordIsValid) {
            return c.json({ success: false, error: 'Invalid credentials.' }, 401);
        }

        const payload = {
            sub: user.id,
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24-hour expiration
        };
        const token = await sign(payload, c.env.JWT_SECRET);

        return c.json({ success: true, token: token });
    } catch (error) {
        console.error("Login Error:", error);
        return c.json({ success: false, error: 'An internal error occurred during login.' }, 500);
    }
});

/**
 * Endpoint for validating a JWT.
 * This is called by other services to verify a user's session.
 */
app.get(
  '/api/validate-token',
  (c, next) => jwt({ secret: c.env.JWT_SECRET })(c, next),
  async (c) => {
    const payload = c.get('jwtPayload');
    return c.json({ success: true, userId: payload.sub });
  }
);


/**
 * A simple health check endpoint.
 */
app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

export default app;
