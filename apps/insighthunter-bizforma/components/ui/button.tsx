import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-teal-600 text-white hover:bg-teal-700"
      : variant === "secondary"
      ? "bg-slate-100 text-slate-900 hover:bg-slate-200"
      : "bg-transparent text-slate-700 hover:bg-slate-100";

  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition ${styles} ${className}`}
      {...props}
    />
  );
}
