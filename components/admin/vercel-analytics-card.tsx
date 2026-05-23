import Link from "next/link";
import { BarChart3, ExternalLink } from "lucide-react";
import {
  getVercelAnalyticsDashboardUrl,
  isVercelWebAnalyticsLikelyEnabled,
} from "@/lib/analytics/vercel-dashboard";

export function VercelAnalyticsCard() {
  const dashboardUrl = getVercelAnalyticsDashboardUrl();
  const enabledOnVercel = isVercelWebAnalyticsLikelyEnabled();

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[0_10px_30px_-20px_rgb(15_23_42/0.22)]">
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-lg bg-muted p-2 text-muted-foreground">
          <BarChart3 size={18} />
        </div>
        <h2 className="font-bold text-foreground">Vercel Web Analytics</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Page views and traffic are collected by{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">@vercel/analytics</code> on
        every public page. Nothing is written to Postgres, so article reads no longer
        increase database cost.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Automatic route tracking on deploy (enable Web Analytics in your Vercel project)</li>
        <li>Per-URL traffic, referrers, and devices in the Vercel dashboard</li>
        <li>Google Analytics remains optional via cookie consent (separate from Vercel)</li>
      </ul>
      {!enabledOnVercel && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Local dev does not send Vercel Analytics events. Deploy to production to see data.
        </p>
      )}
      <Link
        href={dashboardUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Open Vercel Analytics
        <ExternalLink className="h-4 w-4" />
      </Link>
    </div>
  );
}
