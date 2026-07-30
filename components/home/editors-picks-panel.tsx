"use client";

import Link from "next/link";
import { formatTimeAgo } from "@/lib/format/time-ago";
import { formatHeadline } from "@/lib/format/headline";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary/url";
import { articlePublicPath } from "@/lib/brand/article-theme";
import type { ArticleSummary } from "@/types/article";

type EditorsPicksPanelProps = {
  articles: ArticleSummary[];
};

export function EditorsPicksPanel({ articles }: EditorsPicksPanelProps) {
  return (
    <section aria-labelledby="editors-picks-heading">
      <div className="pb-3">
        <p className="text-sm font-semibold text-[#CF1A1E]">
          Editor&apos;s picks
        </p>
        <h2
          id="editors-picks-heading"
          className="mt-1 text-xl font-bold tracking-tight text-neutral-950"
        >
          Worth reading
        </h2>
      </div>

      {articles.length === 0 ? (
        <p className="py-6 text-sm text-neutral-500">Fresh picks coming soon.</p>
      ) : (
        <ol className="divide-y divide-neutral-200">
          {articles.map((article, index) => {
            const timeAgo = formatTimeAgo(article.publishedAt ?? null);
            return (
              <li key={article.id}>
                <Link
                  href={articlePublicPath(article.slug)}
                  className="group flex gap-3 py-4"
                >
                  <span className="w-5 shrink-0 pt-0.5 text-lg font-semibold tabular-nums text-neutral-300">
                    {index + 1}
                  </span>
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-neutral-200">
                    <img
                      src={optimizeCloudinaryUrl(
                        article.coverImageUrl ?? "/placeholder.jpg",
                        { width: 280 },
                      )}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    {timeAgo ? (
                      <p className="text-[11px] font-medium text-neutral-400">
                        {timeAgo}
                      </p>
                    ) : null}
                    <p className="mt-0.5 line-clamp-3 text-sm font-semibold leading-snug text-neutral-900 transition-colors group-hover:text-red-800">
                      {formatHeadline(article.title)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
