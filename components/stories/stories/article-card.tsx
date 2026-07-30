"use client";

import Image from "next/image";
import Link from "next/link";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary/url";
import {
  articlePublicPath,
  hasLaNewsTag,
  hasSanLuisObispoTag,
  hasVenturaCountyTag,
} from "@/lib/brand/article-theme";
import { formatTimeAgo } from "@/lib/format/time-ago";
import { formatHeadline } from "@/lib/format/headline";

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
  const isVentura = hasVenturaCountyTag(article.tags);
  const isLa = hasLaNewsTag(article.tags);
  const isSlo = hasSanLuisObispoTag(article.tags);
  const brandColor = isVentura
    ? "bg-orange-600"
    : isLa
      ? "bg-blue-600"
      : isSlo
        ? "bg-teal-700"
        : "bg-red-600";
  const hoverColor = isVentura
    ? "group-hover:text-orange-600"
    : isLa
      ? "group-hover:text-blue-700"
      : isSlo
        ? "group-hover:text-teal-700"
        : "group-hover:text-red-700";
  const path = articlePublicPath(article.slug);
  const timeAgo = formatTimeAgo(article.publishedAt ?? null);
  const headline = formatHeadline(article.title);
  const imageSrc = optimizeCloudinaryUrl(
    article.coverImageUrl ?? "/placeholder.jpg",
    { width: 900 },
  );

  if (variant === "elevated") {
    return (
      <Link
        href={path}
        className="group flex h-full min-w-0 flex-col overflow-hidden"
      >
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
          <Image
            src={imageSrc}
            alt={headline}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 360px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`${brandColor} w-fit max-w-full truncate rounded px-1.5 py-0.5 text-[10px] font-semibold text-white`}
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
            className={`line-clamp-3 min-w-0 break-words text-[13px] font-semibold leading-snug text-slate-900 transition-colors sm:text-[15px] ${hoverColor}`}
          >
            {headline}
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
      <div className="relative aspect-[4/3] w-1/3 min-w-[100px] shrink-0 overflow-hidden rounded-xl md:aspect-[16/9] md:w-full">
        <Image
          src={imageSrc}
          alt={headline}
          fill
          sizes="(max-width: 768px) 33vw, 900px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-col gap-1 py-1 md:gap-2 md:pb-4 md:pt-3">
        <div className="flex items-center">
          <span
            className={`${brandColor} rounded-sm px-2 py-0.5 text-[10px] font-semibold text-white`}
          >
            {article.category}
          </span>
        </div>

        <h3
          className={`line-clamp-3 text-sm font-semibold leading-snug text-neutral-900 underline-offset-2 transition-colors group-hover:underline md:text-lg ${hoverColor}`}
        >
          {headline}
        </h3>
      </div>
    </Link>
  );
}
