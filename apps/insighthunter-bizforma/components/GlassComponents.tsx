import React from "react";

type ClassValue = string | undefined;

function cx(...values: ClassValue[]) {
  return values.filter(Boolean).join(" ");
}

export function GlassPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-3xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl",
        "supports-[backdrop-filter]:bg-white/10",
        className
      )}
    >
      {children}
    </div>
  );
}

export function GlassCard({
  title,
  description,
  children,
  className,
  action,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <GlassPanel className={cx("p-5 md:p-6", className)}>
      {(title || description || action) && (
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            {title ? (
              <h3 className="text-lg font-semibold text-white">{title}</h3>
            ) : null}
            {description ? (
              <p className="mt-1 max-w-2xl text-sm text-slate-200">{description}</p>
            ) : null}
          </div>
          {action ? <div>{action}</div> : null}
        </div>
      )}
      {children}
    </GlassPanel>
  );
}

export function GlassSection({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("space-y-5", className)}>
      <div className="space-y-2">
        {eyebrow ? (
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-200">
            {eyebrow}
          </div>
        ) : null}
        <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="max-w-3xl text-sm leading-6 text-slate-200 md:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function GlassButton({
  children,
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const styles =
    variant === "primary"
      ? "bg-teal-500 text-slate-950 hover:bg-teal-400"
      : variant === "secondary"
      ? "border border-white/15 bg-white/10 text-white hover:bg-white/15"
      : "text-slate-200 hover:bg-white/10";

  return (
    <button
      className={cx(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-medium",
        "transition focus:outline-none focus:ring-2 focus:ring-teal-300/70",
        styles,
        className
      )}
      {...props}
    />
  );
}

export function GlassInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white",
        "placeholder:text-slate-300/70 focus:border-teal-300/70 focus:outline-none",
        props.className
      )}
    />
  );
}

export function GlassTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={cx(
        "min-h-28 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white",
        "placeholder:text-slate-300/70 focus:border-teal-300/70 focus:outline-none",
        props.className
      )}
    />
  );
}

export function GlassSelect(
  props: React.SelectHTMLAttributes<HTMLSelectElement>
) {
  return (
    <select
      {...props}
      className={cx(
        "w-full rounded-2xl border 
