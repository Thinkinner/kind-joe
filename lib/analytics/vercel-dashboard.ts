/**
 * Link staff to the Vercel Web Analytics dashboard for this project.
 * Set NEXT_PUBLIC_VERCEL_ANALYTICS_DASHBOARD_URL in env for an exact team/project URL.
 */
export function getVercelAnalyticsDashboardUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_DASHBOARD_URL?.trim();
  if (explicit) return explicit;

  const teamSlug = process.env.VERCEL_TEAM_SLUG?.trim();
  const projectSlug = process.env.VERCEL_PROJECT_SLUG?.trim();
  if (teamSlug && projectSlug) {
    return `https://vercel.com/${teamSlug}/${projectSlug}/analytics`;
  }

  return "https://vercel.com/dashboard/analytics";
}

export function isVercelWebAnalyticsLikelyEnabled(): boolean {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}
