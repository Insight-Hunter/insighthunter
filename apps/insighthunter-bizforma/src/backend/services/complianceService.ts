import type { Env } from '../types';

interface ComplianceEvent {
  id: string;
  dueDate: string;
  label: string;
  type: 'FILING' | 'PAYMENT';
  status: 'UPCOMING' | 'PAST_DUE' | 'COMPLETED';
}

export const complianceService = {
  async getEventsForUser(env: Env, userId: string): Promise<ComplianceEvent[]> {
    const now = new Date();
    return [
      {
        id: 'annual-report',
        dueDate: new Date(now.getFullYear(), 3, 15).toISOString(),
        label: 'State annual report',
        type: 'FILING',
        status: 'UPCOMING',
      },
    ];
  },
};
