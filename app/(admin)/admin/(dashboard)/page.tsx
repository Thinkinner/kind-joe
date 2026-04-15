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
  Calendar
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
  icon: any;
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
  ]);

  const totalVisits = currentStats[0]?.visits ?? 0;
  const totalVisitors = currentStats[0]?.visitors ?? 0;
  const totalSessions = currentStats[0]?.sessions ?? 0;
  const previousVisits = previousStats[0]?.visits ?? 0;
  const previousVisitors = previousStats[0]?.visitors ?? 0;
  const previousSessions = previousStats[0]?.sessions ?? 0;

  const minViewedAt = currentBounds[0]?.minViewedAt;
  const maxViewedAt = currentBounds[0]?.maxViewedAt;
  const measuredDays =
    minViewedAt && maxViewedAt
      ? Math.max(
          1,
          Math.ceil(
            (new Date(maxViewedAt).getTime() - new Date(minViewedAt).getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1,
        )
      : chartDays;
  const avgDaily = Math.round(totalVisits / measuredDays);
  const previousAvgDaily = Math.round(previousVisits / measuredDays);
  const noComparison: TrendState = {
    label: "N/A",
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
               Your top article accounts for {topArticles.length > 0 ? Math.round((topArticles[0].views / totalVisits) * 100) : 0}% of all traffic. 
               Consider updating related content to capitalize on this interest.
             </p>
             <button className="mt-6 w-full rounded-xl bg-white py-2.5 text-sm font-bold text-neutral-900 hover:bg-neutral-100 transition-colors">
                Generate Report
             </button>
          </div>

          <div className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-[0_10px_30px_-20px_rgb(15_23_42/0.22)]">
             <h2 className="font-bold text-neutral-900 mb-4">Device Distribution</h2>
             <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
                <p className="text-sm font-medium text-slate-700">N/A</p>
                <p className="mt-1 text-xs text-slate-500">
                  Device metrics are collecting once client-side device tracking is enabled.
                </p>
             </div>
          </div>
        </section>

      </div>
    </div>
  );
}