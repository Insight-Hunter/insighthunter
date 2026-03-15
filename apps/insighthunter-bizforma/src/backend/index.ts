import { Hono }             from 'hono';
import { authMiddleware }   from './middleware/auth.ts';
import { loggerMiddleware } from './middleware/logger';
import { formationRoutes }           from './routes/formation';
import { entityDeterminationRoutes } from './routes/entityDetermination';
import { einRoutes }                 from './routes/ein';
import { stateRegistrationRoutes }   from './routes/stateRegistration';
import { taxAccountRoutes }          from './routes/taxAccounts';
import { complianceRoutes }          from './routes/compliance';
import { documentRoutes }            from './routes/documents';
import { FormationAgent }            from './agents/FormationAgent';
import { ComplianceAgent }           from './agents/ComplianceAgent';
import type { Env }                  from './types';

export { FormationAgent, ComplianceAgent };

const app = new Hono<{ Bindings: Env }>();

app.use('*', loggerMiddleware);
app.use('/api/*', authMiddleware);

app.route('/api/formations',              formationRoutes);
app.route('/api/entity-determination',    entityDeterminationRoutes);
app.route('/api/ein',                     einRoutes);
app.route('/api/state-registration',      stateRegistrationRoutes);
app.route('/api/tax-accounts',            taxAccountRoutes);
app.route('/api/compliance',              complianceRoutes);
app.route('/api/documents',               documentRoutes);

app.get('/health', c => c.json({ status: 'ok', service: 'insighthunter-bizforma' }));

export default {
  fetch: app.fetch,

  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        if (batch.queue === 'bizforma-documents') {
          const { caseId, docId } = msg.body;
          console.log(`[queue] processing doc ${docId} for case ${caseId}`);
        }
        if (batch.queue === 'bizforma-reminders') {
          const { eventId, orgId } = msg.body;
          console.log(`[queue] sending reminder for event ${eventId} org ${orgId}`);
        }
        msg.ack();
      } catch (err) {
        msg.retry();
      }
    }
  },
};
