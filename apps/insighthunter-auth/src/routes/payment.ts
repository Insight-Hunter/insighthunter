
import Stripe from 'stripe';
import type { Context } from 'hono';

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

export async function createSetupIntentHandler(c: Context) {
  try {
    const setupIntent = await requireStripe().setupIntents.create({
      usage: 'on_session',
    });

    return c.json({
      clientSecret: setupIntent.client_secret,
      stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
    });
  } catch (error) {
    console.error('Stripe setup intent error:', error);
    c.status(500);
    return c.json({ error: 'Failed to create payment setup' });
  }
}
