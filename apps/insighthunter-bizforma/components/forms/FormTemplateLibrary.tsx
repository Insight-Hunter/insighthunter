import React from "react";

const templates = [
  "Vendor onboarding form",
  "Client intake form",
  "Compliance checklist form",
  "Employee document request",
];

export default function FormTemplateLibrary() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Template library</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <div key={template} className="rounded-xl bg-slate-50 p-4">
            <div className="font-medium text-slate-900">{template}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
