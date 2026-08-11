/** Calendar date used for staff duty check-ins (ops timezone). */
export const DUTY_TIMEZONE = "America/Los_Angeles";

/** Returns YYYY-MM-DD in America/Los_Angeles. */
export function dutyDateInLA(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DUTY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** 0 = Sunday … 6 = Saturday in America/Los_Angeles. */
export function weekdayInLA(now = new Date()): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: DUTY_TIMEZONE,
    weekday: "short",
  }).format(now);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? now.getUTCDay();
}

export const LA_WEEKDAY_KEYS = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const;

export type LaWeekdayKey = (typeof LA_WEEKDAY_KEYS)[number];

export function laWeekdayKey(now = new Date()): LaWeekdayKey {
  return LA_WEEKDAY_KEYS[weekdayInLA(now)]!;
}
