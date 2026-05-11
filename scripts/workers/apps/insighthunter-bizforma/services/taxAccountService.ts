export function getTaxAccountTasks(state: string) {
  return [
    'Create IRS online account',
    `Review ${state} revenue department registration requirements`,
    'Determine sales tax nexus',
    'Confirm payroll withholding registration if hiring employees',
  ];
}
