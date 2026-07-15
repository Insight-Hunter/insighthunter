export interface Env {
  DB: D1Database;
  IMPORTS: R2Bucket;
  IMPORT_QUEUE: Queue;
  IMPORT_SESSION: DurableObjectNamespace;
  ENVIRONMENT: string;
  IMPORT_BUCKET: string;
}

import { router } from './routes/imports';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return router(request, env, ctx);
  },
  async queue(batch: MessageBatch<any>, env: Env, ctx: ExecutionContext): Promise<void> {
    for (const message of batch.messages) {
      await import('./queues/import-jobs').then(({ handleImportJob }) =>
        handleImportJob(message, env, ctx)
      );
    }
  },
};
