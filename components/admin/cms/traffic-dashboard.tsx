"use client";

import { useState } from "react";
import { getArticleTrafficDetails } from "@/lib/actions/admin-traffic";

export type ArticleTrafficRow = {
  id: string;
  title: string;
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
      <h2 className="mb-4 text-lg font-semibold text-neutral-900">
        Article traffic
      </h2>
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50">
              <th className="p-3 font-medium text-neutral-600">Title</th>
              <th className="p-3 font-medium text-neutral-600">Published</th>
              <th className="p-3 text-right font-medium text-neutral-600">
                Views
              </th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr
                key={a.id}
                className="cursor-pointer border-b border-neutral-100 hover:bg-orange-50/50"
                onClick={() => open(a)}
              >
                <td className="p-3 font-medium text-neutral-900">{a.title}</td>
                <td className="p-3 text-neutral-600">
                  {a.publishedAt
                    ? new Date(a.publishedAt).toLocaleDateString()
                    : "—"}
                </td>
                <td className="p-3 text-right tabular-nums text-neutral-800">
                  {a.totalViews.toLocaleString()}
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
