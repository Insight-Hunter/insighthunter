export function buildEinChecklist(input: { businessName: string; entityType: string; state: string }) {
  return [
    `Confirm legal business name: ${input.businessName}`,
    `Confirm entity type: ${input.entityType}`,
    `Confirm formation state: ${input.state}`,
    'Prepare responsible party details',
    'Prepare principal business activity description',
    'Review SS-4 before filing',
  ];
}
