// packages/types/src/user.ts
import type { Plan, SubscriptionStatus } from './subscriptions.js';

export interface User {
  id: string;
  email: string;
  name: string;
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  onboardingComplete: boolean;
  createdAt: string;
}

export interface SessionPayload {
  userId: string;
  email: string;
  plan: Plan;
  iat: number;
}
