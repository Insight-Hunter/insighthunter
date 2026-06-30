import type { ISODate, UUID } from './common.js';

export interface Organization {
  id: UUID;
  name: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface User {
  id: UUID;
  organizationId: UUID;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
}
