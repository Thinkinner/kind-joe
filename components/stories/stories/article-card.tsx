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
        className="group flex w-full max-w-full min-w-0 items-start gap-3 overflow-hidden py-4 sm:gap-4 sm:py-5"
      >
        <div className="relative h-[4.25rem] w-[4.75rem] shrink-0 overflow-hidden rounded-md bg-slate-100 sm:h-24 sm:w-28 md:h-[6.5rem] md:w-32">
          <img
            src={optimizeCloudinaryUrl(article.coverImageUrl ?? "/placeholder.jpg", {
              width: 640,
            })}
            alt={article.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        <div className="flex min-w-0 flex-1 basis-0 flex-col gap-1 overflow-hidden sm:gap-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`${brandColor} max-w-full truncate rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white`}
            >
              {article.category || "News"}
            </span>
            {timeAgo ? (
              <span className="shrink-0 text-[11px] font-medium text-slate-400 sm:text-xs">
                {timeAgo}
              </span>
            ) : null}
          </div>

          <h3
            className={`line-clamp-3 min-w-0 break-words font-[Poppins] text-[15px] font-bold leading-snug text-slate-900 transition-colors sm:text-base md:text-[17px] ${hoverColor}`}
          >
            {article.title}
          </h3>

          {article.excerpt ? (
            <p className="line-clamp-2 min-w-0 break-words text-sm leading-relaxed text-slate-600">
              {article.excerpt}
            </p>
          ) : null}
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
