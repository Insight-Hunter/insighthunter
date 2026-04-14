export function renderTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
    template,
  );
}
