import React from "react";

export default function AdvisorChat() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">AI advisor chat</h2>
      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
        Ask about entity choice, compliance timing, payroll setup, or tax registration.
      </div>
      <div className="mt-4 flex gap-3">
        <input
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3"
          placeholder="Ask BizForma AI a question"
        />
        <button className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white">
          Send
        </button>
      </div>
    </section>
  );
}
