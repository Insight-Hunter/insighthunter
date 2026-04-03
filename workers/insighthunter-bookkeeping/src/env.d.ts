// packages/auth-middleware/src/env.d.ts
declare namespace App {
  interface Locals {
    userId:           string | null;
    userEmail:        string | null;
    subscriptionTier: string | null;
    runtime: {
      env: {
        JWT_SECRET: string;
        [key: string]: unknown;
      };
    };
  }
}
