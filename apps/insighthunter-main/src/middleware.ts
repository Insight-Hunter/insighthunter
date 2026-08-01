// src/middleware.ts

import { authGuard } from '@insighthunter/auth-shared';

export const onRequest = authGuard();
