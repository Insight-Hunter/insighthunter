import React from "react";

type EntityOption = {
  name: string;
  score: number;
  rationale: string;
  bestFor: string;
};

const sampleOptions: EntityOption[] = [
  {
    name: "LLC",
    score: 92,
    rationale: "Strong liability protection with flexible taxation and simpler upkeep.",
    bestFor: "Owner-operated service businesses and early-stage companies.",
  },
  {
    name: "S Corporation",
    score: 84,
    rationale: "Can reduce self-employment tax after salary planning, but adds payroll complexity.",
    bestFor: "Profitable businesses with stable owner compensation.",
  },
  {
    name: "C Corporation",
    score: 68,
    rationale: "Best for venture-scale growth, equity issuance, and formal governance.",
    bestFor: "Companies planning outside investors or stock-heavy compensation.",
  },
];

export default function EntityAdvisor() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Entity advisor</h2>
        <p className="text-slate-600">
          Compare entity structures using business goals, tax posture, and growth plans.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {sampleOptions.map((option) => (
          <div
            key={option.name}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{option.name}</h3>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700">
                {option.score}/100
              </span>
            </div>
            <p className="mb-3 text-sm text-slate-600">{option.rationale}</p>
            <p className="text-sm text-slate-500">
              <strong>Best for:</strong> {option.bestFor}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
