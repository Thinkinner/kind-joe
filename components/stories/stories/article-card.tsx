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
      }).format(dateObj) // e.g., "Nov 19"
    : "";

  return (
    <Link href={`/${article.slug}`} className="group block w-full">
      <div className="flex flex-col gap-3">
        {/* 1. IMAGE SECTION (16:9 Aspect Ratio) */}
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md border border-neutral-200 bg-neutral-100">
          <img
            src={article.coverImageUrl ?? "/placeholder.jpg"}
            alt={article.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          
          {/* Optional: A subtle gradient at the bottom of the image helps frame it, 
              even without text overlay. */}
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/10 to-transparent" />
        </div>

        {/* 2. CONTENT SECTION (Below Image) */}
        <div className="flex flex-col gap-1.5">
          {/* Metadata Row: Category + Date */}
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span className="text-red-600">
              {article.category}
            </span>
            
            {/* {dateObj && (
              <span className="text-neutral-400 font-medium normal-case">
                {laFormatter}
              </span>
            )} */}
          </div>

          {/* Headline */}
          <h3 className="font-poppins text-lg font-bold leading-snug text-neutral-900 transition-colors line-clamp-3 group-hover:text-blue-900 group-hover:underline decoration-2 underline-offset-2">
            {article.title}
          </h3>
        </div>
      </div>
    </Link>
  );
}