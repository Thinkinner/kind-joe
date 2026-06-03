import { ExternalLink, Globe2 } from "lucide-react";
import { getRenderableArticles } from "@/lib/rss-news/news";

/** ADSENSE_HOLDBACK: was 36 before review. Restore after approval — see docs/homepage-adsense-holdback.md */
const MAX_HEADLINES = 6;

export async function ExternalHeadlinesSection() {
  const articles = await getRenderableArticles(MAX_HEADLINES);
  if (articles.length === 0) return null;

  return (
    <section
      className="border-t border-slate-200/80 bg-slate-50/80 py-10 sm:py-14 md:py-16"
      aria-labelledby="external-headlines-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              External sources
            </p>
            <h2
              id="external-headlines-heading"
              className="flex items-center gap-2 font-[Poppins] text-xl font-bold text-slate-800 md:text-2xl"
            >
              <Globe2 className="h-5 w-5 text-slate-400" aria-hidden />
              Headlines from around the web
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Curated links to other publishers — not hosted on Kind Joe. For our
              original reporting, see the sections above.
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
            Opens in new tab
          </span>
        </div>

        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {articles.map((item) => (
            <li key={item.id}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="group flex h-full items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
              >
                <div className="min-w-0 flex-1">
                  <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {item.source.name}
                  </span>
                  <p className="mt-2 text-sm font-medium leading-snug text-slate-800 group-hover:text-red-700 md:text-[15px]">
                    {item.modifiedTitle || item.title}
                  </p>
                </div>
                <ExternalLink
                  className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-red-500"
                  aria-hidden
                />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
