import React from "react";

const contractors = [
  { name: "North Ridge Design", amount: "$2,400", status: "W-9 received" },
  { name: "Beacon Ops LLC", amount: "$710", status: "Below threshold" },
  { name: "Jasper Media", amount: "$1,320", status: "Needs TIN" },
];

export default function ContractorTracker() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Contractor tracker</h2>
      <div className="mt-4 space-y-3">
        {contractors.map((contractor) => (
          <div
            key={contractor.name}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div className="font-medium text-slate-900">{contractor.name}</div>
              <div className="text-sm text-slate-500">{contractor.amount}</div>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
              {contractor.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
