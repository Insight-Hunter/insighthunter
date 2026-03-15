import type { EINApplication, FormationCase } from '../types';

export function buildSS4Data(app: EINApplication, formation: FormationCase) {
  return {
    line1_legalName:       app?.legalName         ?? formation?.businessName ?? '',
    line2_tradeNameDBA:    app?.tradeNameDBA       ?? '',
    line7a_responsibleParty: app?.responsibleParty ?? '',
    line7b_ssn:            '[SSN — enter securely]',
    line8a_entityType:     mapEntityTypeToSS4(formation?.entityType),
    line9a_reasonForApplying: app?.reasonForApplying ?? 'Started new business',
    line10_dateStarted:    new Date().toISOString().split('T')[0],
    line11_closingMonth:   'December',
    line13_highestEmployees: '0',
    line14_firstPayDate:   '',
    irsOnlineLink: 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online',
  };
}

function mapEntityTypeToSS4(entityType: string | null): string {
  const map: Record<string, string> = {
    sole_prop:   'Sole proprietor (SSN)',
    llc:         'Limited liability company (LLC)',
    s_corp:      'Corporation (elect S-Corp status with Form 2553)',
    c_corp:      'Corporation',
    partnership: 'Partnership',
  };
  return map[entityType ?? ''] ?? 'Other';
}
