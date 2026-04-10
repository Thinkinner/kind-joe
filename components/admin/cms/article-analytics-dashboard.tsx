"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Clock3, Trophy, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  TrafficDashboard,
  type ArticleTrafficRow,
} from "@/components/admin/cms/traffic-dashboard";

type ChartPoint = {
  date: string;
  label: string;
  views: number;
};

type Props = {
  rows: ArticleTrafficRow[];
  chartData: ChartPoint[];
  totalViews: number;
  avgReadTimeLabel: string;
  topCategory: string;
};

export function ArticleAnalyticsDashboard({
  rows,
  chartData,
  totalViews,
  avgReadTimeLabel,
  topCategory,
}: Props) {
  const chartConfig = {
    views: {
      label: "Views",
      color: "rgb(99 102 241)",
    },
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="gap-0">
          <div className="space-y-5 p-6">
            <p className="text-sm font-medium tracking-tight text-muted-foreground">
              Total Views
            </p>
            <p className="text-3xl font-medium tracking-tight text-slate-900">
              {new Intl.NumberFormat("en", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(totalViews)}
            </p>
            <Badge className="rounded-md border-0 bg-emerald-100 text-emerald-700">
              <TrendingUp className="h-3.5 w-3.5" />
              +12.5%
            </Badge>
          </div>
        </Card>

        <Card className="gap-0">
          <div className="space-y-5 p-6">
            <p className="text-sm font-medium tracking-tight text-muted-foreground">
              Avg. Read Time
            </p>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-indigo-500" />
              <p className="text-3xl font-medium tracking-tight text-slate-900">
                {avgReadTimeLabel}
              </p>
            </div>
          </div>
        </Card>

        <Card className="gap-0">
          <div className="space-y-5 p-6">
            <p className="text-sm font-medium tracking-tight text-muted-foreground">
              Top Performing Category
            </p>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-rose-500" />
              <p className="text-3xl font-medium tracking-tight text-slate-900">
                {topCategory}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="gap-0">
        <div className="border-b border-slate-200/60 px-6 py-4">
          <h3 className="text-base font-medium tracking-tight text-slate-900">
            Views over the last 30 days
          </h3>
        </div>
        <div className="p-6">
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
        </div>
      </Card>

      <TrafficDashboard articles={rows} />
    </>
  );
}
