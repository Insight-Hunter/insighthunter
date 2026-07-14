export interface AuthenticatedUser {
  readonly subject: string;
  readonly email?: string;
  readonly orgId?: string;
}

export interface SessionRecord {
  readonly id: string;
  readonly token: string;
  readonly userId: string;
  readonly email: string;
  readonly expiresAt: string;
}

export interface CustomerRecord {
  readonly id: string;
  readonly userId: string;
  readonly email: string;
  readonly stripeCustomerId?: string;
  readonly createdAt: string;
}

export interface SubscriptionRecord {
  readonly id: string;
  readonly customerId: string;
  readonly planCode: string;
  readonly status: string;
  readonly stripeSubscriptionId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
