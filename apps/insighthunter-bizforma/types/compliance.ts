export type ComplianceEvent = {
  id: string;
  title: string;
  dueDate: string;
  status: 'upcoming' | 'completed' | 'overdue';
};

export type RenewalSchedule = {
  id: string;
  businessId: string;
  jurisdiction: string;
  renewalType: string;
  nextDueDate: string;
};
