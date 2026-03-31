// src/components/ui/index.tsx
import React, { type CSSProperties, type ReactNode } from "react";
import { COLORS } from "../../constants";
import type {
  StepLayoutProps,
  FormFieldProps,
  TextInputProps,
  TextAreaProps,
  SegmentedControlProps,
  SelectCardProps,
  AppleButtonProps,
  InfoCardProps,
  ChecklistSectionProps,
  CheckRowProps,
  ResourceLinksProps,
  StateSelectProps,
  StatusBadgeProps,
} from "../../types";
import { US_STATES } from "../../constants";

// ─── StepLayout ───────────────────────────────────────────────────────────────
export function StepLayout({ title, subtitle, icon, children }: StepLayoutProps) {
  return (
    <div style={{ paddingTop: 32, paddingBottom: 24 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 40, marginBottom: 10, lineHeight: 1 }}>{icon}</div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            margin: 0,
            marginBottom: 6,
            color: COLORS.gray1,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: 15,
            color: COLORS.gray5,
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          {subtitle}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}

// ─── FormField ────────────────────────────────────────────────────────────────
export function FormField({ label, children, style }: FormFieldProps) {
  return (
    <div style={{ marginBottom: 20, ...style }}>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          color: COLORS.label2,
          marginBottom: 7,
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── TextInput ────────────────────────────────────────────────────────────────
export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  style,
  maxLength,
  min,
  disabled,
}: TextInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      min={min}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "10px 14px",
        fontSize: 15,
        border: `1px solid ${COLORS.sep}`,
        borderRadius: 10,
        backgroundColor: disabled ? COLORS.bg : COLORS.surface,
        outline: "none",
        boxSizing: "border-box",
        fontFamily: "inherit",
        color: COLORS.gray1,
        transition: "border-color 0.15s",
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = COLORS.blue;
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = COLORS.sep;
      }}
    />
  );
}

// ─── TextArea ─────────────────────────────────────────────────────────────────
export function TextArea({ value, onChange, placeholder, rows = 3 }: TextAreaProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        padding: "10px 14px",
        fontSize: 15,
        border: `1px solid ${COLORS.sep}`,
        borderRadius: 10,
        backgroundColor: COLORS.surface,
        outline: "none",
        resize: "vertical",
        boxSizing: "border-box",
        fontFamily: "inherit",
        color: COLORS.gray1,
        lineHeight: 1.55,
        transition: "border-color 0.15s",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = COLORS.blue;
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = COLORS.sep;
      }}
    />
  );
}

// ─── SegmentedControl ─────────────────────────────────────────────────────────
export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              border: `1px solid ${active ? COLORS.blue : COLORS.sep}`,
              borderRadius: 20,
              backgroundColor: active ? `${COLORS.blue}15` : COLORS.surface,
              color: active ? COLORS.blue : COLORS.gray1,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── SelectCard ──────────────────────────────────────────────────────────────
export function SelectCard({ selected, onClick, children }: SelectCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "12px 14px",
        border: `1.5px solid ${selected ? COLORS.blue : COLORS.sep}`,
        borderRadius: 12,
        backgroundColor: selected ? `${COLORS.blue}08` : COLORS.surface,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        transition: "all 0.15s",
        outline: "none",
      }}
    >
      {children}
    </button>
  );
}

// ─── MultiSelectCard ──────────────────────────────────────────────────────────
export function MultiSelectCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 12px",
        border: `1.5px solid ${selected ? COLORS.blue : COLORS.sep}`,
        borderRadius: 10,
        backgroundColor: selected ? `${COLORS.blue}08` : COLORS.surface,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        gap: 8,
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

// ─── AppleButton ──────────────────────────────────────────────────────────────
export function AppleButton({
  variant = "primary",
  onClick,
  children,
  disabled,
  loading,
  style,
}: AppleButtonProps) {
  const isPrimary = variant === "primary";
  const isDestructive = variant === "destructive";

  const bgColor = disabled
    ? COLORS.sep
    : isPrimary
    ? COLORS.blue
    : isDestructive
    ? `${COLORS.red}15`
    : COLORS.fill;

  const textColor = disabled
    ? COLORS.gray5
    : isPrimary
    ? "#fff"
    : isDestructive
    ? COLORS.red
    : COLORS.gray1;

  return (
    <button
      onClick={onClick}
      disabled={disabled ?? loading}
      style={{
        padding: "10px 20px",
        fontSize: 15,
        fontWeight: 600,
        border: isDestructive ? `1px solid ${COLORS.red}30` : "none",
        borderRadius: 10,
        backgroundColor: bgColor,
        color: textColor,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s",
        opacity: loading ? 0.7 : 1,
        ...style,
      }}
    >
      {loading ? "⏳ Loading…" : children}
    </button>
  );
}

// ─── InfoCard ─────────────────────────────────────────────────────────────────
export function InfoCard({ icon, color, children }: InfoCardProps) {
  return (
    <div
      style={{
        backgroundColor: `${color}10`,
        border: `1px solid ${color}30`,
        borderRadius: 12,
        padding: "12px 14px",
        marginBottom: 16,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ fontSize: 14, lineHeight: 1.55, color: COLORS.gray1 }}>
        {children}
      </div>
    </div>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
export function StatusBadge({ color, children }: StatusBadgeProps) {
  return (
    <div
      style={{
        marginTop: 8,
        padding: "6px 12px",
        borderRadius: 8,
        backgroundColor: `${color}15`,
        color,
        fontSize: 13,
        fontWeight: 600,
        display: "inline-block",
      }}
    >
      {children}
    </div>
  );
}

// ─── ChecklistSection ─────────────────────────────────────────────────────────
export function ChecklistSection({
  title,
  items,
  data,
  onChange,
}: ChecklistSectionProps) {
  return (
    <div style={{ marginBottom: 20 }}>
      {title && (
        <div
          style={{
            fontWeight: 600,
            fontSize: 12,
            color: COLORS.gray5,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            marginBottom: 10,
          }}
        >
          {title}
        </div>
      )}
      <div
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 12,
          overflow: "hidden",
          border: `1px solid ${COLORS.sep}`,
        }}
      >
        {items.map((item, i) => (
          <CheckRow
            key={item.id}
            label={item.label}
            checked={data[item.id] ?? false}
            onChange={(v) => onChange({ ...data, [item.id]: v })}
            style={{
              borderBottom:
                i < items.length - 1 ? `1px solid ${COLORS.sep}` : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── CheckRow ─────────────────────────────────────────────────────────────────
export function CheckRow({ label, checked, onChange, style }: CheckRowProps) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        cursor: "pointer",
        userSelect: "none",
        transition: "background-color 0.1s",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = COLORS.bg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          border: `2px solid ${checked ? COLORS.blue : COLORS.sep}`,
          backgroundColor: checked ? COLORS.blue : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all 0.15s",
        }}
      >
        {checked && (
          <span
            style={{ color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1 }}
          >
            ✓
          </span>
        )}
      </div>
      <span
        style={{
          fontSize: 14,
          textDecoration: checked ? "line-through" : "none",
          color: checked ? COLORS.gray5 : COLORS.gray1,
          lineHeight: 1.4,
          flex: 1,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── ResourceLinks ────────────────────────────────────────────────────────────
export function ResourceLinks({ links }: ResourceLinksProps) {
  if (links.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontWeight: 600,
          fontSize: 11,
          color: COLORS.gray5,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 8,
        }}
      >
        Resources
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 14,
              color: COLORS.blue,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 12 }}>🔗</span>
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── StateSelect ─────────────────────────────────────────────────────────────
export function StateSelect({ value, onChange }: StateSelectProps) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 36px 10px 14px",
          fontSize: 15,
          border: `1px solid ${COLORS.sep}`,
          borderRadius: 10,
          backgroundColor: COLORS.surface,
          outline: "none",
          fontFamily: "inherit",
          color: value ? COLORS.gray1 : COLORS.gray5,
          appearance: "none",
          cursor: "pointer",
        }}
      >
        <option value="">Select state…</option>
        {US_STATES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: COLORS.gray5,
          fontSize: 12,
        }}
      >
        ▼
      </span>
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ style }: { style?: CSSProperties }) {
  return (
    <div
      style={{
        height: 1,
        backgroundColor: COLORS.sep,
        marginBottom: 20,
        ...style,
      }}
    />
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
export function ProgressBar({
  value,
  max = 100,
  color = COLORS.blue,
  height = 5,
}: {
  value: number;
  max?: number;
  color?: string;
  height?: number;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: COLORS.sep,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          backgroundColor: color,
          borderRadius: height / 2,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({
  children,
  color = COLORS.blue,
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: `${color}18`,
        color,
      }}
    >
      {children}
    </span>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
export function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontWeight: 700,
        fontSize: 13,
        textTransform: "uppercase" as const,
        letterSpacing: "0.06em",
        color: COLORS.gray5,
        marginBottom: 10,
        marginTop: 8,
      }}
    >
      {children}
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "40px 24px",
        color: COLORS.gray5,
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div
        style={{ fontWeight: 600, fontSize: 16, color: COLORS.gray1, marginBottom: 6 }}
      >
        {title}
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.5 }}>{subtitle}</div>
    </div>
  );
}
