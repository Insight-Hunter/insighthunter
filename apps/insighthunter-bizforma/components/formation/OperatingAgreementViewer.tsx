import React from "react";

export default function OperatingAgreementViewer() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Operating agreement</h2>
          <p className="text-slate-600">
            Preview governance language before generating the final document.
          </p>
        </div>
        <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Preview PDF
        </button>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-700">
        <p><strong>Article I.</strong> The Company shall be managed in accordance with this Agreement and applicable state law.</p>
        <p><strong>Article II.</strong> Membership interests, capital contributions, and voting thresholds shall be maintained in the Company records.</p>
        <p><strong>Article III.</strong> The Manager or Members, as applicable, may execute actions necessary for tax, banking, and compliance administration.</p>
      </div>
    </section>
  );
}
