import { desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { articlePageviews, articles } from "@/db/schema";
import {
  TrafficDashboard,
  type ArticleTrafficRow,
} from "@/components/admin/cms/traffic-dashboard";

export const dynamic = "force-dynamic";

export default async function ArticleAnalyticsPage() {
  const data = await db
    .select({
      id: articles.id,
      title: articles.title,
      publishedAt: articles.publishedAt,
      totalViews: sql<number>`CAST(COUNT(${articlePageviews.id}) AS INT)`,
    })
    .from(articles)
    .leftJoin(articlePageviews, eq(articles.id, articlePageviews.articleId))
    .where(isNull(articles.deletedAt))
    .groupBy(articles.id, articles.title, articles.publishedAt)
    .orderBy(desc(articles.publishedAt))
    .limit(80);

  const rows: ArticleTrafficRow[] = data.map((r) => ({
    id: r.id,
    title: r.title,
    publishedAt: r.publishedAt,
    totalViews: r.totalViews ?? 0,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Article analytics
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Pageviews by article (latest 80). Click a row for traffic sources.
        </p>
      </div>
      <TrafficDashboard articles={rows} />
    </div>
  );
}
