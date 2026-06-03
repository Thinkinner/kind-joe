"use client";

import Link from "next/link";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary/url";
import { formatTimeAgo } from "@/lib/format/time-ago";

export function ArticleCard({
  article,
  variant = "default",
}: {
  article: {
    slug: string;
    title: string;
    category?: string;
    excerpt?: string | null;
    coverImageUrl?: string | null;
    publishedAt?: string | null;
    readingMinutes?: number | null;
    authorName?: string | null;
    tags?: Array<{ slug: string }>;
  };
  variant?: "default" | "elevated";
}) {
  const hasVenturaTag = article.tags?.some((t) => t.slug === "ventura-county");
  const path = hasVenturaTag ? `/ventura/${article.slug}` : `/${article.slug}`;
  const brandColor = hasVenturaTag ? "bg-orange-600" : "bg-red-600";
  const hoverColor = hasVenturaTag
    ? "group-hover:text-orange-600"
    : "group-hover:text-red-700";
  const timeAgo = formatTimeAgo(article.publishedAt ?? null);

  if (variant === "elevated") {
    return (
      <Link
        href={path}
        className="group flex h-full min-w-0 flex-col overflow-hidden"
      >
        <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-slate-100 sm:rounded-lg">
          <img
            src={optimizeCloudinaryUrl(article.coverImageUrl ?? "/placeholder.jpg", {
              width: 900,
            })}
            alt={article.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-2 sm:gap-1.5 sm:pt-3">
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1">
            <span
              className={`${brandColor} w-fit max-w-full truncate rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white sm:px-2 sm:text-[10px]`}
            >
              {article.category || "News"}
            </span>
            {timeAgo ? (
              <span className="shrink-0 text-[10px] font-medium text-slate-400 sm:text-xs">
                {timeAgo}
              </span>
            ) : null}
          </div>

          <h3
            className={`line-clamp-3 min-w-0 break-words font-[Poppins] text-[13px] font-bold leading-snug text-slate-900 transition-colors sm:text-base ${hoverColor}`}
          >
            {article.title}
          </h3>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={path}
      className="group flex w-full flex-row items-start gap-4 rounded-md md:flex-col md:gap-0"
    >
      <div className="relative aspect-[4/3] w-1/3 min-w-[100px] shrink-0 overflow-hidden rounded-md md:aspect-[16/9] md:w-full">
        <img
          src={optimizeCloudinaryUrl(article.coverImageUrl ?? "/placeholder.jpg", {
            width: 900,
          })}
          alt={article.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-col gap-1 py-1 md:gap-2 md:pt-3 md:pb-4">
        <div className="flex items-center">
          <span
            className={`${brandColor} rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase text-white`}
          >
            {article.category}
          </span>
        </div>

        <h3
          className={`font-[Poppins] line-clamp-3 text-sm font-bold leading-snug text-neutral-900 underline-offset-2 transition-colors group-hover:underline md:text-lg ${hoverColor}`}
        >
          {article.title}
        </h3>
      </div>
    </Link>
  );
}
