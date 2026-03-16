import type { Env } from '../types';

export const einService = {
  async buildSs4Draft(env: Env, userId: string, payload: unknown) {
    return {
      pdfTemplate: 'ss4-draft-v1',
      fields: {
        legalName: 'TBD LLC',
        tradeName: null,
        entityType: 'LLC',
      },
      guidance: [
        'Review legal name exactly as it should appear on IRS records.',
        'Confirm responsible party SSN/ITIN separately; do not store raw SSN here.',
      ],
    };
  },
};
