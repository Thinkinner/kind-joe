/**
 * Authorize Vercel Cron / manual cron invocations.
 *
 * When `CRON_SECRET` is set in the Vercel project, Cron sends:
 *   Authorization: Bearer <CRON_SECRET>
 * Docs: https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
 */
function normalizeSecret(value: string): string {
  return value
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\r?\n/g, "");
}

export function authorizeCronRequest(request: Request): boolean {
  const secret = normalizeSecret(process.env.CRON_SECRET || "");
  const authHeader = (request.headers.get("authorization") || "").trim();

  if (secret) {
    const expected = `Bearer ${secret}`;
    if (authHeader === expected) return true;

    // Some runtimes/proxies lowercase the scheme.
    if (authHeader.toLowerCase() === expected.toLowerCase()) return true;
  }

  const userAgent = (request.headers.get("user-agent") || "").toLowerCase();
  const isVercelCronUa = userAgent.includes("vercel-cron");
  const hasCronSchedule = Boolean(
    request.headers.get("x-vercel-cron-schedule") ||
      request.headers.get("x-vercel-cron"),
  );

  // No secret configured: trust Vercel Cron signals in production; open in dev.
  if (!secret) {
    if (process.env.NODE_ENV !== "production") return true;
    return isVercelCronUa || hasCronSchedule;
  }

  // Secret is set but Authorization didn't match — deny (do not fall back to
  // User-Agent alone; that would weaken CRON_SECRET protection).
  return false;
}
