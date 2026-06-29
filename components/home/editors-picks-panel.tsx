"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatTimeAgo } from "@/lib/format/time-ago";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary/url";
import type { ArticleSummary } from "@/types/article";

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

type EditorsPicksPanelProps = {
  articles: ArticleSummary[];
};

export function EditorsPicksPanel({ articles }: EditorsPicksPanelProps) {
  return (
    <section
      aria-labelledby="editors-picks-heading"
      className="border-l border-red-600 pl-5"
    >
      <div className="border-b border-slate-200 pb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-red-600">
          Don&apos;t miss these
        </p>
        <h2
          id="editors-picks-heading"
          className="mt-1 font-[Poppins] text-lg font-bold tracking-tight text-slate-900"
        >
          Headlines worth your time
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-[13px]">
          Strong hooks from our archive — curated picks, not the hero carousel
          or the newest feed.
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-slate-500">
            Fresh picks are on the way. Browse the latest stories below.
          </p>
          <Link
            href="/news"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-red-600"
          >
            Browse all stories
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      ) : (
        <>
          <ol className="divide-y divide-slate-200">
            {articles.map((article, index) => {
              const timeAgo = formatTimeAgo(article.publishedAt ?? null);

              return (
                <li key={article.id}>
                  <Link
                    href={articlePath(article.slug, article.tags)}
                    className="group flex min-w-0 items-start gap-3 py-4 sm:gap-3.5"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100 sm:h-16 sm:w-16">
                      <img
                        src={optimizeCloudinaryUrl(
                          article.coverImageUrl ?? "/placeholder.jpg",
                          { width: 280 },
                        )}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute left-0 top-0 bg-red-600 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                        {index + 1}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="mb-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                        {article.category ? (
                          <span className="truncate text-[10px] font-bold uppercase tracking-wide text-red-600">
                            {article.category}
                          </span>
                        ) : null}
                        {timeAgo ? (
                          <span className="shrink-0 text-[10px] font-medium text-slate-400 sm:text-[11px]">
                            {timeAgo}
                          </span>
                        ) : null}
                      </div>
                      <p className="line-clamp-3 break-words text-[13px] font-semibold leading-snug text-slate-800 transition-colors group-hover:text-red-700 sm:text-sm">
                        {article.title}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>

          <div className="pt-4">
            <Link
              href="/news"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-red-700"
            >
              Browse all stories
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
