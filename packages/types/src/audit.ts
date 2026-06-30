import type { ISODate, UUID } from './common.js';

export interface AuditEvent {
  id: UUID;
  actorId: UUID;
  organizationId: UUID;
  action: string;
  entity: string;
  entityId: UUID;
  createdAt: ISODate;
}
