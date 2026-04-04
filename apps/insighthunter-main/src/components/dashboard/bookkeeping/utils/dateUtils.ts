// src/utils/dateUtils.ts
import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear, addMonths, subMonths, addYears, subYears, isWithinInterval, differenceInDays } from 'date-fns';

/**
 * Date utility functions for bookkeeping and financial reporting
 */

/**
 * Formats a date for display
 */
export function formatDate(
  date: string | Date,
  formatStr: string = 'MMM dd, yyyy'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Formats a date for API/database (ISO 8601)
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Gets the current date in ISO format
 */
export function today(): string {
  return formatDateISO(new Date());
}

/**
 * Fiscal period helpers
 */
export const fiscalPeriods = {
  /**
   * Gets the current month range
   */
  currentMonth: () => ({
    start: formatDateISO(startOfMonth(new Date())),
    end: formatDateISO(endOfMonth(new Date())),
  }),

  /**
   * Gets the previous month range
   */
  lastMonth: () => {
    const date = subMonths(new Date(), 1);
    return {
      start: formatDateISO(startOfMonth(date)),
      end: formatDateISO(endOfMonth(date)),
    };
  },

  /**
   * Gets a specific month range
   */
  month: (monthsAgo: number) => {
    const date = subMonths(new Date(), monthsAgo);
    return {
      start: formatDateISO(startOfMonth(date)),
      end: formatDateISO(endOfMonth(date)),
    };
  },

  /**
   * Gets the current quarter range
   */
  currentQuarter: () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const startMonth = quarter * 3;

    const start = new Date(now.getFullYear(), startMonth, 1);
    const end = endOfMonth(addMonths(start, 2));

    return {
      start: formatDateISO(start),
      end: formatDateISO(end),
    };
  },

  /**
   * Gets the current year range
   */
  currentYear: () => ({
    start: formatDateISO(startOfYear(new Date())),
    end: formatDateISO(endOfYear(new Date())),
  }),

  /**
   * Gets the previous year range
   */
  lastYear: () => {
    const date = subYears(new Date(), 1);
    return {
      start: formatDateISO(startOfYear(date)),
      end: formatDateISO(endOfYear(date)),
    };
  },

  /**
   * Gets year-to-date range
   */
  yearToDate: () => ({
    start: formatDateISO(startOfYear(new Date())),
    end: formatDateISO(new Date()),
  }),

  /**
   * Gets a custom range
   */
  custom: (startDate: string, endDate: string) => ({
    start: startDate,
    end: endDate,
  }),

  /**
   * Gets the last N days
   */
  lastNDays: (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    return {
      start: formatDateISO(start),
      end: formatDateISO(end),
    };
  },
};

/**
 * Preset date ranges for reports
 */
export const dateRangePresets = [
  { label: 'This Month', value: 'current-month', getPeriod: fiscalPeriods.currentMonth },
  { label: 'Last Month', value: 'last-month', getPeriod: fiscalPeriods.lastMonth },
  { label: 'This Quarter', value: 'current-quarter', getPeriod: fiscalPeriods.currentQuarter },
  { label: 'This Year', value: 'current-year', getPeriod: fiscalPeriods.currentYear },
  { label: 'Last Year', value: 'last-year', getPeriod: fiscalPeriods.lastYear },
  { label: 'Year to Date', value: 'ytd', getPeriod: fiscalPeriods.yearToDate },
  { label: 'Last 30 Days', value: 'last-30', getPeriod: () => fiscalPeriods.lastNDays(30) },
  { label: 'Last 90 Days', value: 'last-90', getPeriod: () => fiscalPeriods.lastNDays(90) },
];

/**
 * Checks if a date is within a fiscal period
 */
export function isInPeriod(
  date: string | Date,
  period: { start: string; end: string }
): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isWithinInterval(dateObj, {
    start: parseISO(period.start),
    end: parseISO(period.end),
  });
}

/**
 * Gets the number of days between two dates
 */
export function daysBetween(start: string | Date, end: string | Date): number {
  const startDate = typeof start === 'string' ? parseISO(start) : start;
  const endDate = typeof end === 'string' ? parseISO(end) : end;
  return differenceInDays(endDate, startDate);
}

/**
 * Formats a date range for display
 */
export function formatDateRange(start: string, end: string): string {
  return `${formatDate(start, 'MMM dd, yyyy')} - ${formatDate(end, 'MMM dd, yyyy')}`;
}

/**
 * Calculates the number of months between two dates
 */
export function monthsBetween(start: string | Date, end: string | Date): number {
  const startDate = typeof start === 'string' ? parseISO(start) : start;
  const endDate = typeof end === 'string' ? parseISO(end) : end;

  const months =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());

  return months;
}

/**
 * Gets the fiscal year for a given date
 */
export function getFiscalYear(
  date: string | Date,
  fiscalYearStartMonth: number = 1
): number {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const month = dateObj.getMonth() + 1; // JS months are 0-indexed
  const year = dateObj.getFullYear();

  if (month < fiscalYearStartMonth) {
    return year - 1;
  }

  return year;
}

/**
 * Gets the fiscal quarter for a given date
 */
export function getFiscalQuarter(
  date: string | Date,
  fiscalYearStartMonth: number = 1
): number {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const month = dateObj.getMonth() + 1;

  // Adjust for fiscal year start
  const adjustedMonth = ((month - fiscalYearStartMonth + 12) % 12) + 1;

  return Math.ceil(adjustedMonth / 3);
}

/**
 * Formats a fiscal period label
 */
export function formatFiscalPeriod(
  date: string | Date,
  fiscalYearStartMonth: number = 1,
  format: 'quarter' | 'month' | 'year' = 'month'
): string {
  const fy = getFiscalYear(date, fiscalYearStartMonth);

  if (format === 'year') {
    return `FY ${fy}`;
  }

  if (format === 'quarter') {
    const quarter = getFiscalQuarter(date, fiscalYearStartMonth);
    return `Q${quarter} FY ${fy}`;
  }

  // Month format
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return `${formatDate(dateObj, 'MMM yyyy')} (FY ${fy})`;
}

/**
 * Generates an array of date labels for charts
 */
export function generateDateLabels(
  start: string,
  end: string,
  interval: 'day' | 'week' | 'month' = 'month'
): string[] {
  const labels: string[] = [];
  const startDate = parseISO(start);
  const endDate = parseISO(end);

  let current = startDate;

  while (current <= endDate) {
    labels.push(formatDateISO(current));

    if (interval === 'day') {
      current = new Date(current.setDate(current.getDate() + 1));
    } else if (interval === 'week') {
      current = new Date(current.setDate(current.getDate() + 7));
    } else if (interval === 'month') {
      current = addMonths(current, 1);
    }
  }

  return labels;
}

/**
 * Gets the accounting period name
 */
export function getAccountingPeriod(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMMM yyyy');
}

/**
 * Checks if a date is in the past
 */
export function isDateInPast(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj < new Date();
}

/**
 * Checks if a date is in the future
 */
export function isDateInFuture(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj > new Date();
}

/**
 * Validates a date string
 */
export function isValidDate(dateString: string): boolean {
  try {
    const date = parseISO(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Gets the age of an invoice/transaction in days
 */
export function getAgeInDays(date: string | Date): number {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return differenceInDays(new Date(), dateObj);
}

/**
 * Categorizes aging (for accounts receivable/payable)
 */
export function categorizeAging(
  date: string | Date
): '0-30' | '31-60' | '61-90' | '90+' {
  const age = getAgeInDays(date);

  if (age <= 30) return '0-30';
  if (age <= 60) return '31-60';
  if (age <= 90) return '61-90';
  return '90+';
}
