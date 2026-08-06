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
