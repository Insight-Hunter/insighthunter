const MINOR_UNITS: Record<string, number> = {
    USD: 100, EUR: 100, GBP: 100, CAD: 100, AUD: 100,
    JPY: 1,   KWD: 1000, BHD: 1000,
  };
  
  export function toMinorUnits(amount: number, currency: string): number {
    return Math.round(amount * (MINOR_UNITS[currency] ?? 100));
  }
  
  export function fromMinorUnits(cents: number, currency: string): number {
    return cents / (MINOR_UNITS[currency] ?? 100);
  }
  
  export function formatCurrency(cents: number, currency = 'USD', locale = 'en-US'): string {
    return new Intl.NumberFormat(locale, { style: 'currency', currency })
      .format(fromMinorUnits(cents, currency));
  }
  
  /** Convert cents from one currency to another using a simple rate. */
  export function convertCurrency(
    amountCents: number, fromCurrency: string, toCurrency: string, rate: number
  ): number {
    if (fromCurrency === toCurrency) return amountCents;
    return Math.round(amountCents * rate);
  }
  