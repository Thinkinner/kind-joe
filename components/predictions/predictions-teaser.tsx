import Link from "next/link";
import type { PredictionMarketView } from "@/lib/predictions/queries";

export function PredictionsTeaser({
  markets,
}: {
  markets: PredictionMarketView[];
}) {
  if (markets.length === 0) return null;

  return (
    <section className="px-5 py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-500">
            Trending
          </p>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            News predictions
          </h2>
        </div>
        <Link
          href="/predictions"
          className="text-sm font-semibold text-slate-700 underline underline-offset-4"
        >
          View all news predictions
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {markets.map((m) => (
          <article
            key={m.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">
              {m.title}
            </h3>
            <div className="mt-3 space-y-2">
              {m.options.slice(0, 3).map((o) => (
                <div key={o.id}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                    <span className="line-clamp-1">{o.label}</span>
                    <span className="font-semibold">{o.percentage}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full bg-slate-400"
                      style={{ width: `${o.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {m.totalVotes.toLocaleString()} votes
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
