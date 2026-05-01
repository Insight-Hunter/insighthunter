export type W4Record = {
  id: string;
  employeeName: string;
  submittedAt: string;
};

export type Contractor1099 = {
  id: string;
  contractorName: string;
  totalPaid: number;
  taxYear: number;
};

export type PayrollSetup = {
  businessId: string;
  stateWithholdingRegistered: boolean;
  futaRequired: boolean;
};
