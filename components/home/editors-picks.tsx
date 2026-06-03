import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getArticlesAction } from "@/lib/actions/articles";
import { formatTimeAgo } from "@/lib/format/time-ago";

function articlePath(slug: string, tags: unknown): string {
  const tagList = Array.isArray(tags) ? tags : [];
  const hasVenturaTag = tagList.some(
    (tag) =>
      tag &&
      typeof tag === "object" &&
      "slug" in tag &&
      (tag as { slug?: string }).slug === "ventura-county",
  );
  return hasVenturaTag ? `/ventura/${slug}` : `/${slug}`;
}

export async function EditorsPicks() {
  const articles = await getArticlesAction(5, 0);
  if (articles.length === 0) return null;

  return (
    <section aria-labelledby="editors-picks-heading">
      <div className="mb-5 border-b-2 border-slate-900/10 pb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-red-600">
          Editor&apos;s picks
        </p>
        <h2
          id="editors-picks-heading"
          className="mt-1 font-[Poppins] text-lg font-bold tracking-tight text-slate-900"
        >
          Top stories today
        </h2>
      </div>

      <ol>
        {articles.map((article, index) => {
          const timeAgo = formatTimeAgo(article.publishedAt ?? null);

          return (
            <li
              key={article.id}
              className="border-b border-slate-300/80 last:border-b-0"
            >
              <Link
                href={articlePath(article.slug, article.tags)}
                className="group flex min-w-0 items-start gap-4 py-4 sm:py-[1.125rem]"
              >
                <span
                  aria-hidden
                  className="w-6 shrink-0 pt-0.5 font-[Poppins] text-xl font-bold leading-none tabular-nums text-slate-300 transition-colors group-hover:text-red-500 sm:text-2xl"
                >
                  {index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  {timeAgo ? (
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400 sm:text-xs">
                      {timeAgo}
                    </p>
                  ) : null}
                  <p className="line-clamp-3 break-words text-[13px] font-semibold leading-snug text-slate-800 transition-colors group-hover:text-red-700 sm:text-sm">
                    {article.title}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 border-t-2 border-slate-900/10 pt-4">
        <Link
          href="/topstories"
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-red-700"
        >
          View all top stories
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </section>
  );
}

export function EditorsPicksSkeleton() {
  return (
    <section aria-hidden>
      <div className="mb-5 border-b-2 border-slate-900/10 pb-4">
        <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-5 w-40 animate-pulse rounded bg-slate-100" />
      </div>
      <div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex animate-pulse gap-4 border-b border-slate-300/80 py-4 last:border-b-0"
          >
            <div className="h-6 w-6 shrink-0 rounded bg-slate-100" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-2.5 w-16 rounded bg-slate-100" />
              <div className="h-3.5 w-full rounded bg-slate-100" />
              <div className="h-3.5 w-[85%] rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
