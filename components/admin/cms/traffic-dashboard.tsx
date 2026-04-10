"use client";

import { useMemo, useState } from "react";
import { getArticleTrafficDetails } from "@/lib/actions/admin-traffic";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export type ArticleTrafficRow = {
  id: string;
  title: string;
  category: string | null;
  coverImageUrl: string | null;
  publishedAt: Date | null;
  totalViews: number;
};

type TrafficDetail = {
  source: string;
  views: number;
};

export function TrafficDashboard({ articles }: { articles: ArticleTrafficRow[] }) {
  const [selected, setSelected] = useState<ArticleTrafficRow | null>(null);
  const [details, setDetails] = useState<TrafficDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const maxViews = useMemo(
    () => Math.max(...articles.map((article) => article.totalViews), 0),
    [articles],
  );

  const open = async (article: ArticleTrafficRow) => {
    setSelected(article);
    setLoading(true);
    const rows = await getArticleTrafficDetails(article.id);
    setDetails(rows);
    setLoading(false);
  };

  const close = () => {
    setSelected(null);
    setDetails([]);
  };

  return (
    <div className="w-full">
      <h2 className="mb-4 text-lg font-medium tracking-tight text-neutral-900">
        Article traffic
      </h2>
      <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-[0_10px_30px_-20px_rgb(15_23_42/0.2)]">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="p-3 font-medium tracking-tight text-neutral-600">Title</th>
              <th className="p-3 font-medium tracking-tight text-neutral-600">Published</th>
              <th className="p-3 text-right font-medium tracking-tight text-neutral-600">
                Views
              </th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr
                key={a.id}
                className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-indigo-50/30"
                onClick={() => open(a)}
              >
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="aspect-[16/10] w-14 shrink-0 overflow-hidden rounded-md border border-slate-200/50 bg-slate-100">
                      {a.coverImageUrl ? (
                        <img
                          src={a.coverImageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-medium tracking-tight text-slate-400">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium tracking-tight text-neutral-900">
                        {a.title}
                      </p>
                      <Badge
                        variant="secondary"
                        className="mt-1 rounded-md border-0 bg-slate-100 text-[11px] font-normal tracking-tight text-slate-600"
                      >
                        {a.category ?? "General"}
                      </Badge>
                    </div>
                  </div>
                </td>
                <td className="p-3 font-normal tracking-tight text-neutral-600">
                  {a.publishedAt
                    ? new Date(a.publishedAt).toLocaleDateString()
                    : "—"}
                </td>
                <td className="p-3 text-right">
                  <div className="ml-auto w-28 space-y-1.5">
                    <p className="tabular-nums font-normal tracking-tight text-neutral-800">
                      {a.totalViews.toLocaleString()}
                    </p>
                    <Progress
                      value={maxViews === 0 ? 0 : (a.totalViews / maxViews) * 100}
                      className="h-1.5 bg-indigo-100/70"
                    />
                  </div>
                </td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-neutral-500">
                  No articles yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-2">
              <h3 className="font-semibold text-neutral-900 line-clamp-2">
                {selected.title}
              </h3>
              <button
                type="button"
                className="shrink-0 text-neutral-400 hover:text-neutral-700"
                onClick={close}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            {loading ? (
              <p className="text-sm text-neutral-500">Loading…</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {details.map((d) => (
                  <li
                    key={d.source}
                    className="flex justify-between gap-4 border-b border-neutral-100 py-2 last:border-0"
                  >
                    <span className="text-neutral-700">{d.source}</span>
                    <span className="tabular-nums font-medium">
                      {d.views.toLocaleString()}
                    </span>
                  </li>
                ))}
                {details.length === 0 && (
                  <li className="text-neutral-500">No view events recorded.</li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
