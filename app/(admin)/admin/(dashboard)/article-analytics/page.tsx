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
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Clock3, Trophy, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  TrafficDashboard,
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
    publishedAt: r.publishedAt,
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

  const chartConfig = {
    views: {
      label: "Views",
      color: "rgb(99 102 241)",
    },
  };

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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-tight text-muted-foreground">
              Total Views
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-medium tracking-tight text-slate-900">
              {(totalViews / 1000).toFixed(1)}k
            </p>
            <Badge className="rounded-md border-0 bg-emerald-100 text-emerald-700">
              <TrendingUp className="h-3.5 w-3.5" />
              +12.5%
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-tight text-muted-foreground">
              Avg. Read Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-indigo-500" />
              <p className="text-3xl font-medium tracking-tight text-slate-900">
                {avgReadTimeLabel}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-tight text-muted-foreground">
              Top Performing Category
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-rose-500" />
              <p className="text-3xl font-medium tracking-tight text-slate-900">
                {topCategory}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium tracking-tight text-slate-900">
            Views over the last 30 days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={chartData} margin={{ left: 8, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(99 102 241 / 0.24)" />
                  <stop offset="100%" stopColor="rgb(99 102 241 / 0.04)" />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgb(241 245 249)" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                minTickGap={24}
                tick={{ fill: "rgb(100 116 139)", fontSize: 12 }}
              />
              <ChartTooltip
                cursor={{ stroke: "rgb(199 210 254)", strokeWidth: 1 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.date
                        ? new Date(payload[0].payload.date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : ""
                    }
                    formatter={(value) => [
                      <span className="font-medium tracking-tight text-slate-900">
                        {(value as number).toLocaleString()} views
                      </span>,
                    ]}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="rgb(99 102 241)"
                strokeWidth={2}
                fill="url(#viewsFill)"
                dot={false}
                activeDot={{ r: 4, fill: "rgb(99 102 241)" }}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <TrafficDashboard articles={rows} />
    </div>
  );
}
