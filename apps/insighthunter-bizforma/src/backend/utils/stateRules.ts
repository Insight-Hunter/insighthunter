type FilingType = 'articles_of_org' | 'articles_of_inc' | 'dba' | 'foreign_qual';

interface StateRule {
  filingName:          string;
  agency:              string;
  feeCents:            number;
  processingDays:      number;
  publicationRequired: boolean;
  portalUrl:           string;
}

const STATE_RULES: Record<string, Record<FilingType, StateRule>> = {
  GA: {
    articles_of_org: {
      filingName: 'Articles of Organization', agency: 'GA Secretary of State',
      feeCents: 10000, processingDays: 7, publicationRequired: false,
      portalUrl: 'https://ecorp.sos.ga.gov',
    },
    articles_of_inc: {
      filingName: 'Articles of Incorporation', agency: 'GA Secretary of State',
      feeCents: 10000, processingDays: 7, publicationRequired: false,
      portalUrl: 'https://ecorp.sos.ga.gov',
    },
    dba: {
      filingName: 'Trade Name Registration', agency: 'County Clerk',
      feeCents: 1500, processingDays: 3, publicationRequired: false,
      portalUrl: 'https://sos.ga.gov/page/trade-name-registration',
    },
    foreign_qual: {
      filingName: 'Certificate of Authority', agency: 'GA Secretary of State',
      feeCents: 22500, processingDays: 10, publicationRequired: false,
      portalUrl: 'https://ecorp.sos.ga.gov',
    },
  },
  // Add other states as needed — GA is the home state
  NY: {
    articles_of_org: {
      filingName: 'Articles of Organization', agency: 'NY Department of State',
      feeCents: 20000, processingDays: 7, publicationRequired: true,
      portalUrl: 'https://appext20.dos.ny.gov/corp_public/CORPSEARCH.ENTITY_SEARCH_ENTRY',
    },
    articles_of_inc: {
      filingName: 'Certificate of Incorporation', agency: 'NY Department of State',
      feeCents: 12500, processingDays: 7, publicationRequired: false,
      portalUrl: 'https://appext20.dos.ny.gov/corp_public/CORPSEARCH.ENTITY_SEARCH_ENTRY',
    },
    dba: {
      filingName: 'Assumed Name Certificate', agency: 'County Clerk',
      feeCents: 2500, processingDays: 3, publicationRequired: false,
      portalUrl: 'https://www.dos.ny.gov',
    },
    foreign_qual: {
      filingName: 'Application for Authority', agency: 'NY Department of State',
      feeCents: 25000, processingDays: 10, publicationRequired: false,
      portalUrl: 'https://appext20.dos.ny.gov',
    },
  },
};

const DEFAULT_RULE: StateRule = {
  filingName: 'Articles of Organization / Incorporation', agency: 'Secretary of State',
  feeCents: 10000, processingDays: 10, publicationRequired: false,
  portalUrl: 'https://www.sos.gov',
};

export function getStateRules(state: string, filingType: FilingType): StateRule {
  return STATE_RULES[state]?.[filingType] ?? DEFAULT_RULE;
}
