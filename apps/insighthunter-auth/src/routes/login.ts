import { Elysia, t } from 'elysia';
import { verifyPassword } from '../lib/password';
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
  .post(
    '/https://auth.insighthunter.app/auth/login',
    async ({ body, set, jwt }) => {
      const { email, password } = body;

      try {
        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase().trim()),
        });

        if (!user || !user.hashedPassword) {
          set.status = 401;
          return { error: 'Invalid credentials' };
        }

        const isValidPassword = await verifyPassword(password, user.hashedPassword);

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
            token,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
            },
          },
        };
      } catch (error) {
        console.error('Login error:', error);
        set.status = 500;
        return { error: 'An unexpected error occurred. Please try again.' };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String(),
      }),
    }
  );
