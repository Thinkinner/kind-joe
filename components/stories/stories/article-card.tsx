"use client";

import Link from "next/link";
import { ArticleSummary } from "@/types/article";

type Props = {
  article: ArticleSummary;
};

export function ArticleCard({ article }: Props) {
  const dateObj = article.publishedAt ? new Date(article.publishedAt) : null;

  // Format using Los Angeles timezone
  const laFormatter = dateObj
    ? new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(dateObj)
    : "";

  return (
    <Link
      href={`/${article.slug}`}
      className="group block w-full rounded-md overflow-hidden bg-white border border-neutral-200 hover:shadow-lg transition-shadow duration-300"
    >
      {/* IMAGE (EDGE TO EDGE) */}
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        <img
          src={article.coverImageUrl ?? "/placeholder.jpg"}
          alt={article.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* CONTENT (SPACING FIXED) */}
      <div className="px-3 pt-3 pb-4 flex flex-col gap-2">

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs font-semibold tracking-wide uppercase">
          <span className="text-red-600">{article.category}</span>

          {laFormatter && (
            <span className="text-neutral-500 font-medium normal-case">
              {laFormatter}
            </span>
          )}
        </div>

        {/* Headline with cleaner padding */}
        <h3 className="font-poppins text-lg font-bold leading-snug text-neutral-900 line-clamp-3 transition-colors group-hover:text-blue-900 group-hover:underline underline-offset-2 pt-1 pb-1">
          {article.title}
        </h3>

        {/* Publisher line */}
        <p className="text-[11px] text-neutral-500 font-medium tracking-wider uppercase">
          Published by <span className="text-neutral-800">Kindjoe Staff</span>
        </p>
      </div>
    </Link>
  );
}