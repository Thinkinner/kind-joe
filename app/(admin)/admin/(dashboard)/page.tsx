import Link from "next/link";
import Image from "next/image";
import { desc, eq, gte, sql } from "drizzle-orm";
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
const parseRange = (r?: string): RangeKey => (["today", "week", "month", "all"].includes(r!) ? r as RangeKey : "week");
const parseTop = (r?: string): TopKey => ([5, 10, 20].includes(Number(r)) ? Number(r) as TopKey : 10);

function getPeriodStart(range: RangeKey, now: Date) {
  if (range === "all") return null;
  const d = new Date(now);
  if (range === "today") d.setHours(0, 0, 0, 0);
  else if (range === "week") d.setDate(d.getDate() - 7);
  else d.setDate(d.getDate() - 30);
  return d;
}

// --- Component Parts ---

function MetricCard({ 
  label, 
  value, 
  prevValue, 
  icon: Icon, 
  trend 
}: { 
  label: string; value: number; prevValue?: number; icon: any; trend?: boolean 
}) {
  const diff = prevValue ? ((value - prevValue) / (prevValue || 1)) * 100 : 0;
  const isPos = diff > 0;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200/60 bg-white p-6 shadow-[0_10px_30px_-20px_rgb(15_23_42/0.22)] transition-all hover:shadow-[0_14px_34px_-20px_rgb(15_23_42/0.24)]">
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-neutral-50 p-2 text-neutral-600 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
          <Icon size={18} />
        </div>
        {trend && prevValue !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-bold ${isPos ? "text-emerald-600" : "text-rose-600"}`}>
            {isPos ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(diff).toFixed(1)}%
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
  const range = parseRange(toSingle(params.range));
  const top = parseTop(toSingle(params.top));

  const now = new Date();
  const currentStart = getPeriodStart(range, now);
  const chartDays = range === "today" ? 1 : range === "week" ? 7 : 30;

  // DB logic remains largely same but cleaned up
  const currentVisitorWhere = currentStart ? gte(visitorJourneyEvents.viewedAt, currentStart) : undefined;
  const currentArticleWhere = currentStart ? gte(articlePageviews.viewedAt, currentStart) : undefined;

  const [
    stats,
    topArticles,
  ] = await Promise.all([
    db.select({
      visits: sql<number>`COUNT(*)`,
      sessions: sql<number>`COUNT(DISTINCT ${visitorJourneyEvents.sessionId})`,
      visitors: sql<number>`COUNT(DISTINCT ${visitorJourneyEvents.visitorId})`
    }).from(visitorJourneyEvents).where(currentVisitorWhere),
    db.select({
      id: articles.id,
      title: articles.title,
      coverImageUrl: articles.coverImageUrl,
      views: sql<number>`COUNT(${articlePageviews.id})`,
    }).from(articlePageviews)
      .innerJoin(articles, eq(articlePageviews.articleId, articles.id))
      .where(currentArticleWhere)
      .groupBy(articles.id).orderBy(desc(sql`COUNT(${articlePageviews.id})`)).limit(top),
  ]);

  const totalVisits = stats[0]?.visits ?? 0;

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
        <MetricCard label="Total Visits" value={totalVisits} icon={MousePointer2} trend />
        <MetricCard label="Unique Visitors" value={stats[0]?.visitors ?? 0} icon={Users} />
        <MetricCard label="Sessions" value={stats[0]?.sessions ?? 0} icon={BarChart3} />
        <MetricCard label="Avg. Daily" value={Math.round(totalVisits / chartDays)} icon={Calendar} />
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
             <div className="space-y-4">
                {/* Dummy data example of how to style more breakdown cards */}
                {[
                    { label: 'Desktop', val: '64%', color: 'bg-primary' },
                    { label: 'Mobile', val: '31%', color: 'bg-indigo-300' },
                    { label: 'Other', val: '5%', color: 'bg-neutral-300' }
                ].map(item => (
                    <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1 font-medium">
                            <span>{item.label}</span>
                            <span className="text-neutral-500">{item.val}</span>
                        </div>
                        <div className="h-1 w-full bg-neutral-100 rounded-full">
                            <div className={`h-full rounded-full ${item.color}`} style={{ width: item.val }} />
                        </div>
                    </div>
                ))}
             </div>
          </div>
        </section>

      </div>
    </div>
  );
}