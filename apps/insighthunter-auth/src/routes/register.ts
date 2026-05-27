
import { Elysia, t } from 'elysia';
import { Argon2id } from 'oslo/password';
import { db } from '../../db';
import { users } from '../../db/schema';

export const registerRoute = new Elysia()
  .post('/api/auth/register', async ({ body, set }) => {
    const { firstName, lastName, email, password } = body;

    try {
      const hashedPassword = await new Argon2id().hash(password);
      const newUser = await db.insert(users).values({ id: crypto.randomUUID(), firstName, lastName, email, hashedPassword }).returning();

      if (newUser.length === 0) {
        set.status = 500;
        return { error: 'Failed to create user' };
      }

      set.status = 201;
      return { message: 'User created successfully' };
    } catch (error) {
      console.error('Registration error:', error);
      set.status = 500;
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  }, {
    body: t.Object({
      firstName: t.String(),
      lastName: t.String(),
      email: t.String({ format: 'email' }),
      password: t.String(),
    }),
  });
