/** Returns ISO date string for first day of given month (1-indexed). */
export function startOfMonth(year: number, month: number): string {
    return new Date(Date.UTC(year, month - 1, 1)).toISOString().split('T')[0];
  }
  
  /** Returns ISO date string for last day of given month. */
  export function endOfMonth(year: number, month: number): string {
    return new Date(Date.UTC(year, month, 0)).toISOString().split('T')[0];
  }
  
  /** Returns start/end ISO dates for a fiscal year (default: calendar year). */
  export function fiscalYear(year: number, fiscalYearStartMonth = 1): { start: string; end: string } {
    const startYear = fiscalYearStartMonth === 1 ? year : year - 1;
    const start = startOfMonth(startYear, fiscalYearStartMonth);
    const endMonth = fiscalYearStartMonth === 1 ? 12 : fiscalYearStartMonth - 1;
    const endYear  = fiscalYearStartMonth === 1 ? year : year;
    const end = endOfMonth(endYear, endMonth);
    return { start, end };
  }
  
  /** Current date as ISO date string (YYYY-MM-DD). */
  export function today(): string {
    return new Date().toISOString().split('T')[0];
  }
  
  /** Parse YYYY-MM-DD → { year, month, day }. */
  export function parseDate(iso: string): { year: number; month: number; day: number } {
    const [year, month, day] = iso.split('-').map(Number);
    return { year, month, day };
  }
  
  /** Check if an ISO date string is within a range (inclusive). */
  export function inRange(date: string, from: string, to: string): boolean {
    return date >= from && date <= to;
  }
  