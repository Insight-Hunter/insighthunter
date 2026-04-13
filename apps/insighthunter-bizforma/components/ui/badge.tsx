import React from "react";

export function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ${className}`}>
      {children}
    </span>
  );
}
