export type StateRequirement = {
  stateCode: string;
  stateName: string;
  llcFeeCents: number;
  corpFeeCents: number;
  annualReportRequired: boolean;
  annualReportFeeCents: number;
  registeredAgentRequired: boolean;
  sosUrl: string;
  notes: string;
};

export const states: StateRequirement[] = [
  {
    stateCode: "GA",
    stateName: "Georgia",
    llcFeeCents: 10000,
    corpFeeCents: 10000,
    annualReportRequired: true,
    annualReportFeeCents: 5000,
    registeredAgentRequired: true,
    sosUrl: "https://ecorp.sos.ga.gov",
    notes: "Georgia annual registration is required for LLCs and corporations.",
  },
  {
    stateCode: "DE",
    stateName: "Delaware",
    llcFeeCents: 11000,
    corpFeeCents: 8900,
    annualReportRequired: true,
    annualReportFeeCents: 30000,
    registeredAgentRequired: true,
    sosUrl: "https://corp.delaware.gov",
    notes: "Franchise tax and annual filing obligations vary by entity type.",
  },
  {
    stateCode: "FL",
    stateName: "Florida",
    llcFeeCents: 12500,
    corpFeeCents: 7000,
    annualReportRequired: true,
    annualReportFeeCents: 13875,
    registeredAgentRequired: true,
    sosUrl: "https://dos.myflorida.com/sunbiz",
    notes: "Sunbiz handles formation and annual reports.",
  },
  {
    stateCode: "TX",
    stateName: "Texas",
    llcFeeCents: 30000,
    corpFeeCents: 30000,
    annualReportRequired: true,
    annualReportFeeCents: 0,
    registeredAgentRequired: true,
    sosUrl: "https://www.sos.state.tx.us",
    notes: "Texas typically pairs public info and franchise tax reporting.",
  },
  {
    stateCode: "CA",
    stateName: "California",
    llcFeeCents: 7000,
    corpFeeCents: 10000,
    annualReportRequired: true,
    annualReportFeeCents: 2000,
    registeredAgentRequired: true,
    sosUrl: "https://bizfileonline.sos.ca.gov",
    notes: "California has separate tax and statement of information obligations.",
  },
];
