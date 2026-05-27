
import { Elysia } from 'elysia';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true
});

export const paymentRoute = new Elysia({ prefix: '/api/auth/payment' })
  .post('/setup-intent', async ({ set }) => {
    try {
      const setupIntent = await stripe.setupIntents.create({
        usage: 'on_session',
      });

      return {
        clientSecret: setupIntent.client_secret,
        stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
      };
    } catch (error) {
      console.error('Stripe setup intent error:', error);
      set.status = 500;
      return { error: 'Failed to create payment setup' };
    }
  });
