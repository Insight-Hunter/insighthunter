
import { Elysia, t } from 'elysia';
import { Argon2id } from 'oslo/password';
import { db } from '../../db';
import { users } from '../../db/schema';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true,
});

export const registerRoute = new Elysia()
  .post('/api/auth/register', async ({ body, set }) => {
    const { firstName, lastName, email, password, setup_intent_id } = body;

    try {
      const existingUser = await db.query.users.findFirst({ where: (users, { eq }) => eq(users.email, email) });
      if (existingUser) {
        set.status = 409;
        return { error: 'User with this email already exists' };
      }

      const setupIntent = await stripe.setupIntents.retrieve(setup_intent_id);
      if (setupIntent.status !== 'succeeded') {
        set.status = 400;
        return { error: 'Payment verification failed. Please try again.' };
      }

      const customer = await stripe.customers.create({
        email,
        name: `${firstName} ${lastName}`,
        payment_method: setupIntent.payment_method as string,
        invoice_settings: {
          default_payment_method: setupIntent.payment_method as string,
        },
      });

      if (!customer) {
        set.status = 500;
        return { error: 'Failed to create Stripe customer' };
      }

      const hashedPassword = await new Argon2id().hash(password);
      const newUser = await db.insert(users).values({
        id: crypto.randomUUID(),
        firstName,
        lastName,
        email,
        hashedPassword,
        stripeCustomerId: customer.id,
      }).returning({ id: users.id, email: users.email });

      if (newUser.length === 0) {
        set.status = 500;
        return { error: 'Failed to create user' };
      }

      set.status = 201;
      return { message: 'User created successfully', user: newUser[0] };
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof Error && 'code' in error && (error as any).code === '23505') {
          set.status = 409;
          return { error: 'User with this email already exists.' };
      }
      set.status = 500;
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  }, {
    body: t.Object({
      firstName: t.String(),
      lastName: t.String(),
      email: t.String({ format: 'email' }),
      password: t.String(),
      setup_intent_id: t.String(),
    }),
  });
