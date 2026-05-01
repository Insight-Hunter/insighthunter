import React from "react";

type Props = {
  entity?: string;
  confidence?: number;
  rationale?: string;
};

export default function EntityRecommendationCard({
  entity = "LLC",
  confidence = 92,
  rationale = "Best balance of simplicity, liability protection, and tax flexibility for the current business profile.",
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{entity}</h3>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-700">
          {confidence}% fit
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-600">{rationale}</p>
    </div>
  );
}
