import React from "react";

export default function FormRenderer() {
  return (
    <form className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Dynamic form renderer</h2>
      <div className="mt-5 grid gap-4">
        <input className="rounded-xl border border-slate-300 px-4 py-3" placeholder="Business name" />
        <textarea className="min-h-28 rounded-xl border border-slate-300 px-4 py-3" placeholder="Describe the request" />
        <button type="submit" className="w-fit rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white">
          Submit
        </button>
      </div>
    </form>
  );
}
