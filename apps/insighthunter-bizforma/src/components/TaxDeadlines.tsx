// src/components/TaxDeadlines.tsx
import React, { useEffect } from "react";
import { COLORS } from "../constants";
import { useTaxDeadlines } from "../hooks/useApi";
import { Badge, EmptyState } from "./ui";
import type { TaxDeadline } from "../types";

const PRIORITY_COLORS: Record<TaxDeadline["priority"], string> = {
  critical: COLORS.red,
  high:     COLORS.orange,
  medium:   COLORS.blue,
  low:      COLORS.gray5,
};

const CATEGORY_ICONS: Record<TaxDeadline["category"], string> = {
  federal: "🦅",
  payroll: "💸",
  state:   "🏠",
};

export function TaxDeadlinesPanel() {
  const { deadlines, loading, fetch } = useTaxDeadlines();

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: COLORS.gray5 }}>
        Loading deadlines…
      </div>
    );
  }

  const grouped = deadlines.reduce<Record<string, TaxDeadline[]>>((acc, d) => {
    acc[d.category] = [...(acc[d.category] ?? []), d];
    return acc;
  }, {});

  return (
    <div style={{ padding: "24px 0" }}>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 4,
          color: COLORS.gray1,
        }}
      >
        📅 Tax & Compliance Calendar
      </h2>
      <p style={{ fontSize: 14, color: COLORS.gray5, marginBottom: 24 }}>
        Key federal and payroll deadlines for the current tax year.
      </p>

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} style={{ marginBottom: 24 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: COLORS.gray5,
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {CATEGORY_ICONS[category as TaxDeadline["category"]]}
            {category}
          </div>
          <div
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 12,
              overflow: "hidden",
              border: `1px solid ${COLORS.sep}`,
            }}
          >
            {items.map((d, i) => (
              <div
                key={`${d.date}-${i}`}
                style={{
                  padding: "12px 14px",
                  borderBottom:
                    i < items.length - 1 ? `1px solid ${COLORS.sep}` : "none",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    backgroundColor: PRIORITY_COLORS[d.priority],
                    marginTop: 6,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      color: COLORS.gray1,
                      marginBottom: 2,
                    }}
                  >
                    {d.date}
                  </div>
                  <div style={{ fontSize: 14, color: COLORS.gray1, lineHeight: 1.4 }}>
                    {d.label}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.gray5, marginTop: 3 }}>
                    {d.form}
                  </div>
                </div>
                <Badge color={PRIORITY_COLORS[d.priority]}>{d.priority}</Badge>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div
        style={{
          fontSize: 12,
          color: COLORS.gray5,
          padding: "12px 14px",
          backgroundColor: COLORS.fill,
          borderRadius: 10,
          lineHeight: 1.5,
        }}
      >
        ⚠️ Dates are estimates. Always verify with your CPA or IRS.gov. Deadlines
        that fall on weekends or holidays shift to the next business day.
      </div>
    </div>
  );
}
