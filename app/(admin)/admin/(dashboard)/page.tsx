import Link from "next/link";
import Image from "next/image";
import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { articles } from "@/db/schema";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  FileText,
  FilePenLine,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  formatTrendState,
  getPeriodWindow,
  parseTrendRange,
  type TrendState,
} from "@/lib/analytics/trends";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary/url";
import { getServerSession } from "@/lib/auth/server";
import { AssignedLinksDashboardCard } from "@/components/admin/assigned-links-dashboard-card";

type RangeKey = "today" | "week" | "month" | "all";
type TopKey = 5 | 10 | 20;

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "24h" },
  { key: "week", label: "7d" },
  { key: "month", label: "30d" },
  { key: "all", label: "All Time" },
];

const toSingle = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const parseTop = (r?: string): TopKey =>
  [5, 10, 20].includes(Number(r)) ? (Number(r) as TopKey) : 10;

const publishedWhere = and(eq(articles.isDraft, false), isNull(articles.deletedAt));

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
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-[0_10px_30px_-20px_rgb(15_23_42/0.22)] transition-all hover:shadow-[0_14px_34px_-20px_rgb(15_23_42/0.24)]">
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-muted p-2 text-muted-foreground transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
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
                    ? "text-muted-foreground"
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
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tracking-tight text-foreground">
          {value.toLocaleString()}
        </p>
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

  const session = await getServerSession();
  const userId = session?.user?.id ?? null;

  const now = new Date();
  const period = getPeriodWindow(range, now);

  const currentPublishedWhere =
    period.currentStart && range !== "all"
      ? and(
          publishedWhere,
          gte(articles.publishedAt, period.currentStart),
          lt(articles.publishedAt, period.currentEnd),
        )
      : publishedWhere;

  const previousPublishedWhere =
    period.previousStart && period.previousEnd
      ? and(
          publishedWhere,
          gte(articles.publishedAt, period.previousStart),
          lt(articles.publishedAt, period.previousEnd),
        )
      : undefined;

  const myPublishedWhere = userId
    ? and(publishedWhere, eq(articles.authorId, userId))
    : publishedWhere;

  const myPublishedInPeriodWhere = userId
    ? and(currentPublishedWhere, eq(articles.authorId, userId))
    : currentPublishedWhere;

  const [
    publishedInPeriodRows,
    previousPublishedRows,
    draftRows,
    myPublishedRows,
    myPublishedInPeriodRows,
    recentArticles,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`CAST(COUNT(*) AS INT)` })
      .from(articles)
      .where(currentPublishedWhere),
    db
      .select({ count: sql<number>`CAST(COUNT(*) AS INT)` })
      .from(articles)
      .where(previousPublishedWhere),
    db
      .select({ count: sql<number>`CAST(COUNT(*) AS INT)` })
      .from(articles)
      .where(
        userId
          ? and(
              eq(articles.isDraft, true),
              isNull(articles.deletedAt),
              eq(articles.authorId, userId),
            )
          : and(eq(articles.isDraft, true), isNull(articles.deletedAt)),
      ),
    db
      .select({ count: sql<number>`CAST(COUNT(*) AS INT)` })
      .from(articles)
      .where(myPublishedWhere),
    db
      .select({ count: sql<number>`CAST(COUNT(*) AS INT)` })
      .from(articles)
      .where(myPublishedInPeriodWhere),
    db
      .select({
        id: articles.id,
        title: articles.title,
        coverImageUrl: articles.coverImageUrl,
        publishedAt: articles.publishedAt,
        category: articles.category,
      })
      .from(articles)
      .where(myPublishedInPeriodWhere)
      .orderBy(desc(articles.publishedAt))
      .limit(top),
  ]);

  const publishedInPeriod = publishedInPeriodRows[0]?.count ?? 0;
  const previousPublished = previousPublishedRows[0]?.count ?? 0;
  const draftCount = draftRows[0]?.count ?? 0;
  const myPublished = myPublishedRows[0]?.count ?? 0;
  const myPublishedInPeriod = myPublishedInPeriodRows[0]?.count ?? 0;

  const noComparison: TrendState = {
    label: "No comparison",
    direction: "na",
    isAvailable: false,
    deltaPercent: null,
  };
  const publishedTrend =
    range === "all"
      ? noComparison
      : formatTrendState(publishedInPeriod, previousPublished);

  const latestTitle = recentArticles[0]?.title ?? "your latest story";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Content overview. Traffic uses Vercel Web Analytics (not the database).
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-[0_8px_22px_-16px_rgb(15_23_42/0.2)]">
          {RANGE_OPTIONS.map((opt) => (
            <Link
              key={opt.key}
              href={`?range=${opt.key}&top=${top}`}
              className={`px-4 py-1.5 text-sm font-medium transition-all ${
                range === opt.key
                  ? "rounded-lg bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={range === "all" ? "Your published" : "You published (period)"}
          value={range === "all" ? myPublished : myPublishedInPeriod}
          icon={UserRound}
        />
        <MetricCard label="Your total published" value={myPublished} icon={Calendar} />
        <MetricCard label="Your drafts" value={draftCount} icon={FilePenLine} />
        <MetricCard
          label={range === "all" ? "Site published" : "Site published (period)"}
          value={publishedInPeriod}
          icon={FileText}
          trendState={publishedTrend}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <AssignedLinksDashboardCard variant="large" />
        </section>

        <section className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 text-foreground shadow-[0_10px_30px_-20px_rgb(15_23_42/0.22)]">
            <div className="mb-4 w-fit rounded-lg bg-muted p-2 text-muted-foreground">
              <FileText size={20} />
            </div>
            <h2 className="text-xl font-bold text-foreground">Self focus</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Your latest: {latestTitle}. You&apos;ve published {myPublished}{" "}
              {myPublished === 1 ? "article" : "articles"} total.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg border border-border bg-muted/50 px-2 py-2">
                <p className="text-lg font-bold tabular-nums text-foreground">
                  {myPublishedInPeriod}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  This period
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 px-2 py-2">
                <p className="text-lg font-bold tabular-nums text-foreground">
                  {draftCount}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Drafts
                </p>
              </div>
            </div>
            <Link
              href="/admin/articles/new"
              className="mt-6 block w-full rounded-xl bg-primary py-2.5 text-center text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              New article
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_10px_30px_-20px_rgb(15_23_42/0.22)]">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-bold text-foreground">
                Recently published
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {myPublished} total · showing {recentArticles.length}
              </p>
            </div>
            <div className="divide-y divide-border">
              {recentArticles.slice(0, 5).map((article) => (
                <Link
                  key={article.id}
                  href={`/admin/articles/${article.id}/edit`}
                  className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/60"
                >
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
                    {article.coverImageUrl && (
                      <Image
                        src={optimizeCloudinaryUrl(article.coverImageUrl, {
                          width: 128,
                        })}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium text-foreground">
                      {article.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {article.publishedAt
                        ? new Date(article.publishedAt).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                </Link>
              ))}
              {recentArticles.length === 0 && (
                <p className="p-4 text-center text-xs text-muted-foreground">
                  No articles in this period.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
