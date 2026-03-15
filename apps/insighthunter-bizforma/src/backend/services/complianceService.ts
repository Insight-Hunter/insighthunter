import type { D1Database, EntityType, ComplianceEvent } from '../types';
import { nanoid } from 'nanoid';

interface ComplianceTemplate {
  eventType: string;
  title:     string;
  dueDays:   number; // days from now
}

function getTemplates(entityType: EntityType, state: string): ComplianceTemplate[] {
  const templates: ComplianceTemplate[] = [
    { eventType: 'boi_report',     title: 'FinCEN BOI Report',               dueDays: 90  },
    { eventType: 'annual_report',  title: `${state} Annual Report`,           dueDays: 365 },
    { eventType: 'tax_filing',     title: 'Federal Tax Return',               dueDays: 105 }, // April 15
    { eventType: 'estimated_tax',  title: 'Q1 Estimated Tax Payment',         dueDays: 105 },
  ];
  if (entityType === 's_corp') {
    templates.push({ eventType: 'form_2553',  title: 'File Form 2553 (S-Corp Election)', dueDays: 75 });
  }
  return templates;
}

export async function seedComplianceEvents(
  db:         D1Database,
  caseId:     string,
  orgId:      string,
  entityType: EntityType,
  state:      string,
): Promise<ComplianceEvent[]> {
  const templates = getTemplates(entityType, state);
  const now       = new Date();
  const events: ComplianceEvent[] = [];

  const inserts = templates.map(t => {
    const dueDate = new Date(now.getTime() + t.dueDays * 86400000).toISOString().split('T')[0];
    const id      = nanoid();
    const event: ComplianceEvent = {
      id, orgId, caseId,
      eventType:    t.eventType,
      title:        t.title,
      dueDate,
      status:       'upcoming',
      reminderSent: false,
      createdAt:    now.toISOString(),
    };
    events.push(event);
    return db.prepare(
      `INSERT OR IGNORE INTO compliance_events
       (id, org_id, case_id, event_type, title, due_date, status, reminder_sent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'upcoming', 0, ?)`
    ).bind(id, orgId, caseId, t.eventType, t.title, dueDate, now.toISOString());
  });

  await db.batch(inserts);
  return events;
}
