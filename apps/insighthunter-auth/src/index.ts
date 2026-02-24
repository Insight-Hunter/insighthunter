// apps/insighthunter-auth/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Define the environment bindings that will be available to the worker.
export interface Env {
  DB: D1Database;
  AUTH_TOKENS: KVNamespace;
}

const app = new Hono<{ Bindings: Env }>();

// --- CORS Middleware ---
// Allow cross-origin requests from any domain.
app.use('*', cors({
  origin: (origin) => origin,
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

    // Combine salt and hash, then encode as a hex string for easy storage.
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

        // Constant-time comparison to prevent timing attacks
        return crypto.subtle.timingSafeEqual(storedHash, new Uint8Array(derivedHashBuffer));
    } catch (e) {
        console.error("Error during password verification:", e);
        return false;
    }
}


/**
 * Generates a cryptographically secure, random token.
 * @returns A 64-character hex string to be used as an auth token.
 */
function generateToken(): string {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
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
        // Check if user already exists
        const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (existingUser) {
            return c.json({ success: false, error: 'User with this email already exists.' }, 409);
        }

        const hashedPassword = await hashPassword(password);
        
        // Insert the new user and retrieve their ID
        const result = await c.env.DB.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?) RETURNING id')
            .bind(name, email, hashedPassword)
            .first();

        if (!result || !result.id) {
            throw new Error("Failed to create user or retrieve user ID.");
        }
        
        const userId = result.id;
        const token = generateToken();
        
        // Store the token in KV with a 24-hour expiration
        await c.env.AUTH_TOKENS.put(token, userId.toString(), { expirationTtl: 86400 }); 

        return c.json({ success: true, token: token });
    } catch (error) {
        console.error("Signup Error:", error);
        return c.json({ success: false, error: 'An internal error occurred during signup.' }, 500);
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

        const token = generateToken();
        await c.env.AUTH_TOKENS.put(token, user.id.toString(), { expirationTtl: 86400 }); // 24-hour expiration

        return c.json({ success: true, token: token });
    } catch (error) {
        console.error("Login Error:", error);
        return c.json({ success: false, error: 'An internal error occurred during login.' }, 500);
    }
});

/**
 * Endpoint for validating an authentication token.
 * This is called by other services to verify a user's session.
 */
app.get('/api/validate-token', async (c) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader ? authHeader.split(' ')[1] : null;

    if (!token) {
        return c.json({ success: false, error: 'Unauthorized: Token not provided.' }, 401);
    }

    const userId = await c.env.AUTH_TOKENS.get(token);

    if (!userId) {
        return c.json({ success: false, error: 'Unauthorized: Invalid or expired token.' }, 401);
    }

    return c.json({ success: true, userId: userId });
});


/**
 * A simple health check endpoint.
 */
app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

export default app;
