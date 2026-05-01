export function formationSummaryTemplate(input: {
  businessName: string;
  state: string;
  entityType: string;
  generatedFor: string;
}) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Formation Summary</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
      h1 { font-size: 28px; margin-bottom: 8px; }
      .card { border: 1px solid #d1d5db; border-radius: 12px; padding: 16px; margin-top: 16px; }
      .muted { color: #6b7280; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      td { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    </style>
  </head>
  <body>
    <h1>${input.businessName} Formation Summary</h1>
    <p class="muted">Prepared for ${input.generatedFor}</p>
    <div class="card">
      <table>
        <tr><td><strong>Business name</strong></td><td>${input.businessName}</td></tr>
        <tr><td><strong>State</strong></td><td>${input.state}</td></tr>
        <tr><td><strong>Entity type</strong></td><td>${input.entityType}</td></tr>
      </table>
    </div>
  </body>
</html>`;
}
