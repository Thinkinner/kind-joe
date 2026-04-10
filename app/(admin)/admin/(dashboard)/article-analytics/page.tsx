import {
  and,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import { articlePageviews, articles } from "@/db/schema";
import {
  ArticleAnalyticsDashboard,
} from "@/components/admin/cms/article-analytics-dashboard";
import {
  type ArticleTrafficRow,
} from "@/components/admin/cms/traffic-dashboard";

export const dynamic = "force-dynamic";

type TodaySourceStats = {
  google: number;
  facebook: number;
  instagram: number;
};

function toHost(referrer?: string | null): string {
  if (!referrer) return "";
  try {
    return new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function aggregateTodaySources(
  rows: Array<{ trafficSource: string | null; utmSource: string | null; referrer: string | null; views: number }>,
): TodaySourceStats {
  const out: TodaySourceStats = { google: 0, facebook: 0, instagram: 0 };
  for (const row of rows) {
    const joined = [row.trafficSource, row.utmSource, toHost(row.referrer)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const views = row.views ?? 0;
    if (!views) continue;

    if (joined.includes("google") || joined.includes("search")) {
      out.google += views;
    }
    if (joined.includes("facebook") || joined.includes("fb.com") || joined === "fb") {
      out.facebook += views;
    }
    if (
      joined.includes("instagram") ||
      joined.includes("instagr.am") ||
      joined === "ig"
    ) {
      out.instagram += views;
    }
  }
  return out;
}

export default async function ArticleAnalyticsPage() {
  const [data, dailyViewsRaw, avgReadMinutesRaw, topCategoryRaw, todaySourcesRaw] =
    await Promise.all([
      db
        .select({
          id: articles.id,
          title: articles.title,
          category: articles.category,
          coverImageUrl: articles.coverImageUrl,
          publishedAt: articles.publishedAt,
          totalViews: sql<number>`CAST(COUNT(${articlePageviews.id}) AS INT)`,
        })
        .from(articles)
        .leftJoin(articlePageviews, eq(articles.id, articlePageviews.articleId))
        .where(isNull(articles.deletedAt))
        .groupBy(
          articles.id,
          articles.title,
          articles.category,
          articles.coverImageUrl,
          articles.publishedAt,
        )
        .orderBy(desc(articles.publishedAt))
        .limit(80),
      db
        .select({
          day: sql<string>`TO_CHAR(DATE_TRUNC('day', ${articlePageviews.viewedAt}), 'YYYY-MM-DD')`,
          views: sql<number>`CAST(COUNT(${articlePageviews.id}) AS INT)`,
        })
        .from(articlePageviews)
        .where(
          gte(articlePageviews.viewedAt, sql`NOW() - INTERVAL '30 days'`),
        )
        .groupBy(sql`DATE_TRUNC('day', ${articlePageviews.viewedAt})`)
        .orderBy(sql`DATE_TRUNC('day', ${articlePageviews.viewedAt})`),
      db
        .select({
          value: sql<number>`COALESCE(ROUND(AVG(${articles.readingMinutes})), 0)`,
        })
        .from(articles)
        .where(and(isNull(articles.deletedAt), isNotNull(articles.readingMinutes))),
      db
        .select({
          category: sql<string>`COALESCE(${articles.category}, 'General')`,
          views: sql<number>`CAST(COUNT(${articlePageviews.id}) AS INT)`,
        })
        .from(articles)
        .leftJoin(articlePageviews, eq(articles.id, articlePageviews.articleId))
        .where(isNull(articles.deletedAt))
        .groupBy(sql`COALESCE(${articles.category}, 'General')`)
        .orderBy(desc(sql`COUNT(${articlePageviews.id})`))
        .limit(1),
      db
        .select({
          trafficSource: articlePageviews.trafficSource,
          utmSource: articlePageviews.utmSource,
          referrer: articlePageviews.referrer,
          views: sql<number>`CAST(COUNT(${articlePageviews.id}) AS INT)`,
        })
        .from(articlePageviews)
        .where(gte(articlePageviews.viewedAt, sql`DATE_TRUNC('day', NOW())`))
        .groupBy(
          articlePageviews.trafficSource,
          articlePageviews.utmSource,
          articlePageviews.referrer,
        ),
    ]);

  const rows: ArticleTrafficRow[] = data.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    coverImageUrl: r.coverImageUrl,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    totalViews: r.totalViews ?? 0,
  }));

  const totalViews = rows.reduce((sum, row) => sum + row.totalViews, 0);
  const avgReadMinutes = avgReadMinutesRaw[0]?.value ?? 0;
  const minutes = Math.floor(avgReadMinutes);
  const seconds = Math.round((avgReadMinutes - minutes) * 60);
  const avgReadTimeLabel = `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  const topCategory = topCategoryRaw[0]?.category ?? "General";
  const todaySourceStats = aggregateTodaySources(todaySourcesRaw);

  const dailyViewsMap = new Map(
    dailyViewsRaw.map((item) => [item.day, item.views ?? 0]),
  );
  const chartData = Array.from({ length: 30 }, (_, idx) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (29 - idx));
    const key = d.toISOString().slice(0, 10);
    return {
      date: key,
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      views: dailyViewsMap.get(key) ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-neutral-900">
          Article analytics
        </h1>
        <p className="mt-1 text-sm font-normal tracking-tight text-neutral-600">
          Pageviews by article (latest 80). Click a row for traffic sources.
        </p>
      </div>
      <ArticleAnalyticsDashboard
        rows={rows}
        chartData={chartData}
        totalViews={totalViews}
        avgReadTimeLabel={avgReadTimeLabel}
        topCategory={topCategory}
        todaySourceStats={todaySourceStats}
      />
    </div>
  );
}
