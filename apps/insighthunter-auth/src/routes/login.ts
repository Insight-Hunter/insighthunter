
import { Elysia, t } from 'elysia';
import { Argon2id } from 'oslo/password';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { jwt } from '@elysiajs/jwt';

export const loginRoute = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'your-secret-key',
    })
  )
  .post('/api/auth/login', async ({ body, set, jwt }) => {
    const { email, password } = body;

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase()),
      });

      if (!user || !user.hashedPassword) {
        set.status = 401;
        return { error: 'Invalid credentials' };
      }

      const isValidPassword = await new Argon2id().verify(user.hashedPassword, password);

      if (!isValidPassword) {
        set.status = 401;
        return { error: 'Invalid credentials' };
      }

      const token = await jwt.sign({
        userId: user.id,
        email: user.email,
      });

      set.status = 200;
      return {
        data: {
          token: token,
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      set.status = 500;
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String(),
    }),
  });
