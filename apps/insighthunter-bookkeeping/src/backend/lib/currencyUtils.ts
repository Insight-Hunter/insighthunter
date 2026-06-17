export function toMinorUnits(amount: number | string, _currency = "USD"): number {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return Math.round(n * 100);
}

export function fromMinorUnits(amount: number, _currency = "USD"): number {
  return amount / 100;
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(fromMinorUnits(amount, currency));
}
