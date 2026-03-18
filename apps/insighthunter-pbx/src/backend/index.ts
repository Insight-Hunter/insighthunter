
import { Router } from 'itty-router';
import { Toucan } from 'toucan-js';

import { Env, CF } from './types';
import { voice } from './twilio-webhooks/voice';
import { status } from './twilio-webhooks/status';
import { sms } from './twilio-webhooks/sms';

const router = Router();

router.post('/twilio/voice', voice);
router.post('/twilio/status', status);
router.post('/twilio/sms', sms);

// 404 for everything else
router.all('*', () => new Response('Not Found.', { status: 404 }));

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const sentry = new Toucan({
      dsn: env.SENTRY_DSN,
      request,
      context: ctx,
    });

    try {
      return await router.handle(request, env, ctx);
    } catch (err) {
      sentry.captureException(err);
      return new Response('Something went wrong.', {
        status: 500,
        statusText: 'Internal Server Error',
      });
    }
  },
};

export { PBXRoom } from './durable-objects/PBXRoom';
export { CallSession } from './durable-objects/CallSession';
