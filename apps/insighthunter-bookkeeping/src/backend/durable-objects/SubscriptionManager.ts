// src/backend/durable-objects/SubscriptionManager.ts
import { DurableObject } from 'cloudflare:workers';
import Stripe from 'stripe';
import type { Subscription, PricingTier, UsageMetrics } from '@/types';
import { getPlanById } from '../utils/pricing';
import type { Env } from '../index';

export class SubscriptionManager extends DurableObject<Env> {
  private stripe: Stripe;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.includes('/create') && request.method === 'POST') {
      return this.createSubscription(request);
    }

    if (path.match(/\/subscriptions\/[\w-]+$/) && request.method === 'GET') {
      return this.getSubscription(request);
    }

    if (path.includes('/cancel') && request.method === 'POST') {
      return this.cancelSubscription(request);
    }

    if (path.includes('/update') && request.method === 'POST') {
      return this.updateSubscription(request);
    }

    if (path.includes('/usage') && request.method === 'GET') {
      return this.getUsageMetrics(request);
    }

    if (path.includes('/webhooks/stripe') && request.method === 'POST') {
      return this.handleStripeWebhook(request);
    }

    return new Response('Not Found', { status: 404 });
  }

  private async createSubscription(request: Request): Promise<Response> {
    try {
      const { userId, companyId, planId, paymentMethodId } = await request.json() as { userId: string, companyId: string, planId: string, paymentMethodId: string };

      const plan = getPlanById(planId);
      if (!plan) {
        return Response.json({ error: 'Invalid plan' }, { status: 400 });
      }

      // Check if subscription already exists
      const existing = await this.ctx.storage.get<Subscription>(`sub:${userId}`);
      if (existing && existing.status === 'active') {
        return Response.json({ error: 'Subscription already exists' }, { status: 400 });
      }

      // Create Stripe customer
      const customer = await this.stripe.customers.create({
        metadata: {
          userId,
          companyId,
        },
      });

      // Attach payment method
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      // Set as default payment method
      await this.stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Create subscription
      const stripeSubscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: plan.stripePriceId }],
        trial_period_days: 14, // 14-day free trial
        metadata: {
          userId,
          companyId,
          tier: plan.tier,
        },
      });

      const subscription: Subscription = {
        id: crypto.randomUUID(),
        userId,
        companyId,
        planId: plan.id,
        tier: plan.tier,
        status: 'trialing',
        currentPeriodStart: new Date(
          stripeSubscription.current_period_start * 1000
        ).toISOString(),
        currentPeriodEnd: new Date(
          stripeSubscription.current_period_end * 1000
        ).toISOString(),
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: customer.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.ctx.storage.put(`sub:${userId}`, subscription);

      return Response.json({ success: true, subscription });
    } catch (error) {
      console.error('Subscription creation error:', error);
      return Response.json(
        { error: 'Failed to create subscription' },
        { status: 500 }
      );
    }
  }

  private async getSubscription(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop();

    const subscription = await this.ctx.storage.get<Subscription>(`sub:${userId}`);

    if (!subscription) {
      return Response.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return Response.json({ subscription });
  }

  private async cancelSubscription(request: Request): Promise<Response> {
    try {
      const { userId, immediate } = await request.json() as { userId: string, immediate: boolean };

      const subscription = await this.ctx.storage.get<Subscription>(`sub:${userId}`);

      if (!subscription) {
        return Response.json({ error: 'Subscription not found' }, { status: 404 });
      }

      // Cancel in Stripe
      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: !immediate,
      });

      if (immediate) {
        await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
        subscription.status = 'cancelled';
      } else {
        subscription.cancelAtPeriodEnd = true;
      }

      subscription.updatedAt = new Date().toISOString();

      await this.ctx.storage.put(`sub:${userId}`, subscription);

      return Response.json({ success: true, subscription });
    } catch (error) {
      console.error('Subscription cancellation error:', error);
      return Response.json(
        { error: 'Failed to cancel subscription' },
        { status: 500 }
      );
    }
  }

  private async updateSubscription(request: Request): Promise<Response> {
    try {
      const { userId, newPlanId } = await request.json() as { userId: string, newPlanId: string };

      const subscription = await this.ctx.storage.get<Subscription>(`sub:${userId}`);

      if (!subscription) {
        return Response.json({ error: 'Subscription not found' }, { status: 404 });
      }

      const newPlan = getPlanById(newPlanId);
      if (!newPlan) {
        return Response.json({ error: 'Invalid plan' }, { status: 400 });
      }

      // Update in Stripe
      const stripeSubscription = await this.stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: newPlan.stripePriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      });

      subscription.planId = newPlan.id;
      subscription.tier = newPlan.tier;
      subscription.updatedAt = new Date().toISOString();

      await this.ctx.storage.put(`sub:${userId}`, subscription);

      return Response.json({ success: true, subscription });
    } catch (error) {
      console.error('Subscription update error:', error);
      return Response.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }
  }

  private async getUsageMetrics(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const period = url.searchParams.get('period') || new Date().toISOString().substring(0, 7);

    const metrics = await this.ctx.storage.get<UsageMetrics>(
      `usage:${userId}:${period}`
    );

    return Response.json({ metrics: metrics || {
      subscriptionId: '',
      period,
      transactions: 0,
      bankAccounts: 0,
      storage: 0,
      aiReconciliations: 0,
    }});
  }

  private async handleStripeWebhook(request: Request): Promise<Response> {
    try {
      const signature = request.headers.get('stripe-signature');
      if (!signature) {
        return Response.json({ error: 'No signature' }, { status: 400 });
      }

      const body = await request.text();
      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.env.STRIPE_WEBHOOK_SECRET
      );

      switch (event.type) {
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
      }

      return Response.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      return Response.json({ error: 'Webhook processing failed' }, { status: 400 });
    }
  }

  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
    const userId = stripeSubscription.metadata.userId;
    const subscription = await this.ctx.storage.get<Subscription>(`sub:${userId}`);

    if (subscription) {
      subscription.status = stripeSubscription.status as Subscription['status'];
      subscription.currentPeriodStart = new Date(
        stripeSubscription.current_period_start * 1000
      ).toISOString();
      subscription.currentPeriodEnd = new Date(
        stripeSubscription.current_period_end * 1000
      ).toISOString();
      subscription.updatedAt = new Date().toISOString();

      await this.ctx.storage.put(`sub:${userId}`, subscription);
    }
  }

  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
    const userId = stripeSubscription.metadata.userId;
    const subscription = await this.ctx.storage.get<Subscription>(`sub:${userId}`);

    if (subscription) {
      subscription.status = 'cancelled';
      subscription.updatedAt = new Date().toISOString();
      await this.ctx.storage.put(`sub:${userId}`, subscription);
    }
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    // Log successful payment
    console.log('Payment succeeded for invoice:', invoice.id);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    // Handle failed payment - could send notification, update subscription status, etc.
    console.log('Payment failed for invoice:', invoice.id);
  }
}
