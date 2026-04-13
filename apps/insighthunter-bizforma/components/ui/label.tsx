import React from "react";

export function Label({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <label className={`mb-2 block text-sm font-medium text-slate-700 ${className}`}>{children}</label>;
}
