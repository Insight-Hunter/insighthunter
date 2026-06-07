
import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { hashPassword } from '../lib/password';
import { db } from '../../db';
import { users } from '../../db/schema';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-04-10',
      typescript: true,
    })
  : null;

function requireStripe() {
  if (!stripe) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }
  return stripe;
}

export const registerRoute = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'your-secret-key',
    })
  )
  .post(
    '/https://auth.insighthunter.app/auth/register',
    async ({ body, set, jwt }) => {
      const {
        firstName,
        lastName,
        company,
        email,
        password,
        plan,
        setup_intent_id,
      } = body;

      try {
        const normalizedEmail = email.toLowerCase().trim();

        const existingUser = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.email, normalizedEmail),
        });

        if (existingUser) {
          set.status = 409;
          return { error: 'User with this email already exists.' };
        }

        let stripeCustomerId: string | null = null;
        const isPaidPlan = plan === 'standard' || plan === 'pro';

        if (isPaidPlan) {
          if (!setup_intent_id) {
            set.status = 400;
            return { error: 'Payment setup is required for paid plans.' };
          }

          const stripeClient = requireStripe();
          const setupIntent = await stripeClient.setupIntents.retrieve(setup_intent_id);

          if (setupIntent.status !== 'succeeded') {
            set.status = 400;
            return { error: 'Payment verification failed. Please try again.' };
          }

          const customer = await stripeClient.customers.create({
            email: normalizedEmail,
            name: `${firstName} ${lastName}`,
            payment_method: setupIntent.payment_method as string,
            invoice_settings: {
              default_payment_method: setupIntent.payment_method as string,
            },
            metadata: {
              company: company ?? '',
              plan,
            },
          });

          if (!customer) {
            set.status = 500;
            return { error: 'Failed to create Stripe customer.' };
          }

          stripeCustomerId = customer.id;
        }

        const hashedPassword = await hashPassword(password);

        const newUsers = await db
          .insert(users)
          .values({
            id: crypto.randomUUID(),
            firstName,
            lastName,
            email: normalizedEmail,
            hashedPassword,
            stripeCustomerId,
          })
          .returning({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            stripeCustomerId: users.stripeCustomerId,
          });

        if (newUsers.length === 0) {
          set.status = 500;
          return { error: 'Failed to create user.' };
        }

        const createdUser = newUsers[0];

        const token = await jwt.sign({
          userId: createdUser.id,
          email: createdUser.email,
        });

        set.status = 201;
        return {
          data: {
            token,
            user: createdUser,
            plan,
          },
        };
      } catch (error) {
        console.error('Registration error:', error);

        if (error instanceof Error && 'code' in error && (error as any).code === '23505') {
          set.status = 409;
          return { error: 'User with this email already exists.' };
        }

        set.status = 500;
        return { error: 'An unexpected error occurred. Please try again.' };
      }
    },
    {
      body: t.Object({
        firstName: t.String(),
        lastName: t.String(),
        company: t.Optional(t.String()),
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 8 }),
        plan: t.Union([
          t.Literal('lite'),
          t.Literal('standard'),
          t.Literal('pro'),
        ]),
        setup_intent_id: t.Optional(t.String()),
      }),
    }
  );
