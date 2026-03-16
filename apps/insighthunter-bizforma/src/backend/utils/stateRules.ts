export const stateRules: Record<
  string,
  { filingFee: number; timelineDays: number; steps: string[] }
> = {
  DEFAULT: {
    filingFee: 100,
    timelineDays: 10,
    steps: ['Prepare articles', 'File with SOS', 'Obtain EIN'],
  },
  GA: {
    filingFee: 100,
    timelineDays: 7,
    steps: ['Reserve name (optional)', 'File with Georgia SOS', 'Publish if required'],
  },
};
