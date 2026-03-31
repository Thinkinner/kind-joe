type AuthLogLevel = "info" | "warn" | "error";

/** Structured auth logs — never pass passwords, OTPs, or tokens. */
export function logAuthEvent(
  level: AuthLogLevel,
  event: string,
  meta?: Record<string, unknown>,
): void {
  const payload = { event, ...meta };
  const line = `[auth] ${JSON.stringify(payload)}`;
  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    default:
      console.info(line);
  }
}
