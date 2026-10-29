// Business-hours evaluation for call-flow routing (docs/insight-pbx-master-prompt.md §4.3).

export interface BusinessHours {
  timezone: string;
  /** 0 = Sunday .. 6 = Saturday, in the schedule's timezone. */
  days: number[];
  /** "HH:MM" 24h, inclusive start, exclusive end. */
  open: string;
  close: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function isValidClock(value: string): boolean {
  return /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value);
}

export function isWithinBusinessHours(now: Date, hours: BusinessHours): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: hours.timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const day = WEEKDAYS.indexOf(get("weekday"));
  const clock = `${get("hour")}:${get("minute")}`;
  return hours.days.includes(day) && clock >= hours.open && clock < hours.close;
}
