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

export default async function ArticleAnalyticsPage() {
  const [data, dailyViewsRaw, avgReadMinutesRaw, topCategoryRaw] =
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
      />
    </div>
  );
}
