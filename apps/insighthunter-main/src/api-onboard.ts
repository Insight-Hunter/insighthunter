export interface OrganizationRecord {
  id: string;
  name: string;
  ownerEmail: string;
  createdAt: string;
}

export function createOrganizationRecord(name: string, ownerEmail: string): OrganizationRecord {
  return {
    id: crypto.randomUUID(),
    name,
    ownerEmail,
    createdAt: new Date().toISOString(),
  };
}
