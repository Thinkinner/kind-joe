import Link from "next/link";
import Image from "next/image";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { articlePageviews, articles, visitorJourneyEvents } from "@/db/schema";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Users, 
  MousePointer2, 
  FileText, 
  BarChart3,
  Calendar,
  type LucideIcon,
} from "lucide-react";
import {
  formatTrendState,
  getPeriodWindow,
  parseTrendRange,
  type TrendState,
} from "@/lib/analytics/trends";

// --- Types & Constants ---
type RangeKey = "today" | "week" | "month" | "all";
type TopKey = 5 | 10 | 20;

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "24h" },
  { key: "week", label: "7d" },
  { key: "month", label: "30d" },
  { key: "all", label: "All Time" },
];

// --- Utilities ---
const toSingle = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;
const parseTop = (r?: string): TopKey => ([5, 10, 20].includes(Number(r)) ? Number(r) as TopKey : 10);

// --- Component Parts ---

function MetricCard({ 
  label, 
  value, 
  icon: Icon, 
  trendState,
}: { 
  label: string;
  value: number;
  icon: LucideIcon;
  trendState?: TrendState;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200/60 bg-white p-6 shadow-[0_10px_30px_-20px_rgb(15_23_42/0.22)] transition-all hover:shadow-[0_14px_34px_-20px_rgb(15_23_42/0.24)]">
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-neutral-50 p-2 text-neutral-600 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
          <Icon size={18} />
        </div>
        {trendState && (
          <div
            className={`flex items-center gap-0.5 text-xs font-bold ${
              trendState.direction === "up"
                ? "text-emerald-600"
                : trendState.direction === "down"
                  ? "text-rose-600"
                  : trendState.direction === "flat"
                    ? "text-slate-600"
                    : "text-amber-600"
            }`}
          >
            {trendState.direction === "up" ? <ArrowUpRight size={14} /> : null}
            {trendState.direction === "down" ? <ArrowDownRight size={14} /> : null}
            {trendState.label}
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-neutral-500">{label}</p>
        <p className="text-2xl font-bold tracking-tight text-neutral-900">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

function computeMeasuredDays(
  minViewedAt: Date | null,
  maxViewedAt: Date | null,
  fallbackDays: number,
) {
  if (!minViewedAt || !maxViewedAt) return fallbackDays;
  return Math.max(
    1,
    Math.ceil(
      (new Date(maxViewedAt).getTime() - new Date(minViewedAt).getTime()) /
        (1000 * 60 * 60 * 24),
    ) + 1,
  );
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const range = parseTrendRange(toSingle(params.range)) as RangeKey;
  const top = parseTop(toSingle(params.top));

  const now = new Date();
  const period = getPeriodWindow(range, now);
  const chartDays = range === "today" ? 1 : range === "week" ? 7 : range === "month" ? 30 : 30;

  const currentVisitorWhere =
    period.currentStart && range !== "all"
      ? and(
          gte(visitorJourneyEvents.viewedAt, period.currentStart),
          lt(visitorJourneyEvents.viewedAt, period.currentEnd),
        )
      : undefined;
  const previousVisitorWhere =
    period.previousStart && period.previousEnd
      ? and(
          gte(visitorJourneyEvents.viewedAt, period.previousStart),
          lt(visitorJourneyEvents.viewedAt, period.previousEnd),
        )
      : undefined;
  const currentArticleWhere =
    period.currentStart && range !== "all"
      ? and(
          gte(articlePageviews.viewedAt, period.currentStart),
          lt(articlePageviews.viewedAt, period.currentEnd),
        )
      : undefined;

  const [
    currentStats,
    previousStats,
    topArticles,
    currentBounds,
    previousBounds,
    deviceStats,
  ] = await Promise.all([
    db.select({
      visits: sql<number>`COUNT(*)`,
      sessions: sql<number>`COUNT(DISTINCT ${visitorJourneyEvents.sessionId})`,
      visitors: sql<number>`COUNT(DISTINCT ${visitorJourneyEvents.visitorId})`
    }).from(visitorJourneyEvents).where(currentVisitorWhere),
    db.select({
      visits: sql<number>`COUNT(*)`,
      sessions: sql<number>`COUNT(DISTINCT ${visitorJourneyEvents.sessionId})`,
      visitors: sql<number>`COUNT(DISTINCT ${visitorJourneyEvents.visitorId})`
    }).from(visitorJourneyEvents).where(previousVisitorWhere),
    db.select({
      id: articles.id,
      title: articles.title,
      coverImageUrl: articles.coverImageUrl,
      views: sql<number>`COUNT(${articlePageviews.id})`,
    }).from(articlePageviews)
      .innerJoin(articles, eq(articlePageviews.articleId, articles.id))
      .where(currentArticleWhere)
      .groupBy(articles.id).orderBy(desc(sql`COUNT(${articlePageviews.id})`)).limit(top),
    db.select({
      minViewedAt: sql<Date | null>`MIN(${visitorJourneyEvents.viewedAt})`,
      maxViewedAt: sql<Date | null>`MAX(${visitorJourneyEvents.viewedAt})`,
    }).from(visitorJourneyEvents).where(currentVisitorWhere),
    db.select({
      minViewedAt: sql<Date | null>`MIN(${visitorJourneyEvents.viewedAt})`,
      maxViewedAt: sql<Date | null>`MAX(${visitorJourneyEvents.viewedAt})`,
    }).from(visitorJourneyEvents).where(previousVisitorWhere),
    db.select({
      mobile: sql<number>`SUM(CASE
        WHEN (
          ${visitorJourneyEvents.userAgent} ILIKE '%mobile%' OR
          ${visitorJourneyEvents.userAgent} ILIKE '%iphone%' OR
          ${visitorJourneyEvents.userAgent} ILIKE '%android%'
        )
        AND ${visitorJourneyEvents.userAgent} NOT ILIKE '%ipad%'
        AND ${visitorJourneyEvents.userAgent} NOT ILIKE '%tablet%'
        THEN 1 ELSE 0 END)::int`,
      tablet: sql<number>`SUM(CASE
        WHEN (
          ${visitorJourneyEvents.userAgent} ILIKE '%ipad%' OR
          ${visitorJourneyEvents.userAgent} ILIKE '%tablet%' OR
          ${visitorJourneyEvents.userAgent} ILIKE '%kindle%' OR
          ${visitorJourneyEvents.userAgent} ILIKE '%sm-t%'
        )
        THEN 1 ELSE 0 END)::int`,
      desktop: sql<number>`SUM(CASE
        WHEN ${visitorJourneyEvents.userAgent} IS NOT NULL
        AND ${visitorJourneyEvents.userAgent} <> ''
        AND ${visitorJourneyEvents.userAgent} NOT ILIKE '%mobile%'
        AND ${visitorJourneyEvents.userAgent} NOT ILIKE '%iphone%'
        AND ${visitorJourneyEvents.userAgent} NOT ILIKE '%android%'
        AND ${visitorJourneyEvents.userAgent} NOT ILIKE '%ipad%'
        AND ${visitorJourneyEvents.userAgent} NOT ILIKE '%tablet%'
        AND ${visitorJourneyEvents.userAgent} NOT ILIKE '%kindle%'
        AND ${visitorJourneyEvents.userAgent} NOT ILIKE '%sm-t%'
        THEN 1 ELSE 0 END)::int`,
      other: sql<number>`SUM(CASE
        WHEN ${visitorJourneyEvents.userAgent} IS NULL
        OR ${visitorJourneyEvents.userAgent} = ''
        THEN 1 ELSE 0 END)::int`,
    }).from(visitorJourneyEvents).where(currentVisitorWhere),
  ]);

  const totalVisits = currentStats[0]?.visits ?? 0;
  const totalVisitors = currentStats[0]?.visitors ?? 0;
  const totalSessions = currentStats[0]?.sessions ?? 0;
  const previousVisits = previousStats[0]?.visits ?? 0;
  const previousVisitors = previousStats[0]?.visitors ?? 0;
  const previousSessions = previousStats[0]?.sessions ?? 0;

  const currentMeasuredDays = computeMeasuredDays(
    currentBounds[0]?.minViewedAt ?? null,
    currentBounds[0]?.maxViewedAt ?? null,
    chartDays,
  );
  const previousMeasuredDays = computeMeasuredDays(
    previousBounds[0]?.minViewedAt ?? null,
    previousBounds[0]?.maxViewedAt ?? null,
    chartDays,
  );
  const avgDaily =
    totalVisits > 0 ? Math.round(totalVisits / currentMeasuredDays) : 0;
  const previousAvgDaily =
    previousVisits > 0
      ? Math.round(previousVisits / previousMeasuredDays)
      : 0;
  const noComparison: TrendState = {
    label: "No comparison",
    direction: "na",
    isAvailable: false,
    deltaPercent: null,
  };
  const visitsTrend = range === "all" ? noComparison : formatTrendState(totalVisits, previousVisits);
  const visitorsTrend =
    range === "all" ? noComparison : formatTrendState(totalVisitors, previousVisitors);
  const sessionsTrend =
    range === "all" ? noComparison : formatTrendState(totalSessions, previousSessions);
  const avgDailyTrend =
    range === "all" ? noComparison : formatTrendState(avgDaily, previousAvgDaily);
  const deviceCounts = {
    mobile: Math.max(0, Number(deviceStats[0]?.mobile ?? 0)),
    desktop: Math.max(0, Number(deviceStats[0]?.desktop ?? 0)),
    tablet: Math.max(0, Number(deviceStats[0]?.tablet ?? 0)),
    other: Math.max(0, Number(deviceStats[0]?.other ?? 0)),
  };
  const deviceTotal =
    deviceCounts.mobile +
    deviceCounts.desktop +
    deviceCounts.tablet +
    deviceCounts.other;
  const deviceRows = [
    { key: "desktop", label: "Desktop", value: deviceCounts.desktop },
    { key: "mobile", label: "Mobile", value: deviceCounts.mobile },
    { key: "tablet", label: "Tablet", value: deviceCounts.tablet },
    { key: "other", label: "Other/Unknown", value: deviceCounts.other },
  ] as const;
  const topArticleSharePercent =
    topArticles.length > 0 && totalVisits > 0
      ? Math.round((topArticles[0].views / totalVisits) * 100)
      : 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10">
      {/* Header Section */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Analytics</h1>
          <p className="text-neutral-500">Overview of your platform performance.</p>
        </div>
        
        <div className="flex items-center gap-1 rounded-xl border border-slate-200/60 bg-white p-1 shadow-[0_8px_22px_-16px_rgb(15_23_42/0.2)]">
          {RANGE_OPTIONS.map((opt) => (
            <Link
              key={opt.key}
              href={`?range=${opt.key}&top=${top}`}
              className={`px-4 py-1.5 text-sm font-medium transition-all ${
                range === opt.key 
                  ? "rounded-lg bg-primary text-primary-foreground shadow-sm" 
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </header>

      {/* Primary Metrics Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Visits"
          value={totalVisits}
          icon={MousePointer2}
          trendState={visitsTrend}
        />
        <MetricCard
          label="Unique Visitors"
          value={totalVisitors}
          icon={Users}
          trendState={visitorsTrend}
        />
        <MetricCard
          label="Sessions"
          value={totalSessions}
          icon={BarChart3}
          trendState={sessionsTrend}
        />
        <MetricCard
          label="Avg. Daily"
          value={avgDaily}
          icon={Calendar}
          trendState={avgDailyTrend}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        
        <section className="lg:col-span-2 space-y-6">
          <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-[0_10px_30px_-20px_rgb(15_23_42/0.22)]">
             <div className="flex items-center justify-between border-b border-slate-200/60 p-6">
                <h2 className="text-lg font-bold text-neutral-900">Popular Content</h2>
                <div className="flex gap-1 rounded-lg bg-neutral-50 p-1">
                    {[5, 10, 20].map(n => (
                        <Link 
                            key={n} 
                            href={`?range=${range}&top=${n}`}
                            className={`rounded-md px-3 py-1 text-xs font-bold ${top === n ? "bg-white text-primary shadow-sm" : "text-neutral-500"}`}
                        >
                            {n}
                        </Link>
                    ))}
                </div>
             </div>
             <div className="divide-y divide-neutral-100">
                {topArticles.map((article, idx) => (
                  <Link 
                    key={article.id} 
                    href={`/admin/articles/${article.id}/edit`}
                    className="flex items-center gap-4 p-4 hover:bg-neutral-50 transition-colors"
                  >
                    <span className="text-sm font-bold text-neutral-300 w-4">{idx + 1}</span>
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                      {article.coverImageUrl && (
                        <Image src={article.coverImageUrl} alt="" fill className="object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate font-semibold text-neutral-900 group-hover:text-primary">{article.title}</h3>
                      <p className="text-xs text-neutral-500">{article.views.toLocaleString()} views this period</p>
                    </div>
                    <div className="text-right">
                       <div className="h-1.5 w-24 rounded-full bg-neutral-100 overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${(article.views / (topArticles[0]?.views || 1)) * 100}%` }} 
                          />
                       </div>
                    </div>
                  </Link>
                ))}
             </div>
          </div>
        </section>

        {/* Sidebar / Secondary Stats */}
        <section className="space-y-6">
          <div className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-900 p-6 text-white shadow-[0_20px_40px_-26px_rgb(15_23_42/0.55)]">
             <div className="mb-4 w-fit rounded-full bg-white/10 p-2 text-indigo-300">
                <FileText size={20} />
             </div>
             <h2 className="text-xl font-bold">Content Strategy</h2>
             <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
               Your top article accounts for {topArticleSharePercent}% of all traffic. 
               Consider updating related content to capitalize on this interest.
             </p>
             <button className="mt-6 w-full rounded-xl bg-white py-2.5 text-sm font-bold text-neutral-900 hover:bg-neutral-100 transition-colors">
                Generate Report
             </button>
          </div>

          <div className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-[0_10px_30px_-20px_rgb(15_23_42/0.22)]">
             <h2 className="font-bold text-neutral-900 mb-4">Device Distribution</h2>
             {deviceTotal > 0 ? (
               <div className="space-y-3">
                 {deviceRows.map((row) => {
                   const pct = Math.round((row.value / deviceTotal) * 100);
                   return (
                     <div key={row.key} className="space-y-1">
                       <div className="flex items-center justify-between text-xs text-slate-600">
                         <span>{row.label}</span>
                         <span className="font-medium">
                           {row.value.toLocaleString()} ({pct}%)
                         </span>
                       </div>
                       <div className="h-1.5 w-full rounded-full bg-slate-100">
                         <div
                           className="h-full rounded-full bg-indigo-500"
                           style={{ width: `${pct}%` }}
                         />
                       </div>
                     </div>
                   );
                 })}
               </div>
             ) : (
               <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
                 <p className="text-sm font-medium text-slate-700">No device data yet</p>
                 <p className="mt-1 text-xs text-slate-500">
                   Device metrics will appear once traffic is tracked for this period.
                 </p>
               </div>
             )}
          </div>
        </section>

      </div>
    </div>
  );
}