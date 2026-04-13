import React from "react";

export function Checkbox(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" {...props} className={`h-4 w-4 rounded border-slate-300 ${props.className ?? ""}`} />;
}
