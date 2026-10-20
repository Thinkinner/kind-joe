import Image from "next/image";
import Link from "next/link";
import {
  articlePublicPath,
  articleShowsMainImage,
} from "@/lib/brand/article-theme";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary/url";
import { formatHeadline } from "@/lib/format/headline";
import { formatTimeAgo } from "@/lib/format/time-ago";
import type { ArticleSummary } from "@/types/article";

export function StoryListRow({
  article,
  tone = "light",
  /** Force images on (e.g. Local Desks columns are always local). */
  forceShowImage = false,
  compact = false,
}: {
  article: ArticleSummary;
  tone?: "light" | "dark";
  forceShowImage?: boolean;
  compact?: boolean;
}) {
  const headline = formatHeadline(article.title);
  const timeAgo = formatTimeAgo(article.publishedAt ?? null);
  const showImage = forceShowImage || articleShowsMainImage(article);
  const thumb = showImage
    ? optimizeCloudinaryUrl(article.coverImageUrl ?? "/placeholder.jpg", {
        width: 280,
      })
    : null;
  const dark = tone === "dark";

  return (
    <Link
      href={articlePublicPath(article.slug)}
      className={`group items-start ${
        compact ? "gap-3 py-3" : "gap-3 py-3.5 sm:gap-4"
      } ${
        showImage
          ? compact
            ? "grid grid-cols-[80px_minmax(0,1fr)]"
            : "grid grid-cols-[88px_minmax(0,1fr)] sm:grid-cols-[100px_minmax(0,1fr)]"
          : "flex"
      }`}
    >
      {showImage && thumb ? (
        <div
          className={`relative aspect-[4/3] overflow-hidden ${
            dark ? "rounded-md bg-neutral-800" : "bg-neutral-200"
          }`}
        >
          <Image src={thumb} alt="" fill sizes="100px" className="object-cover" />
        </div>
      ) : null}
      <span className="min-w-0 flex-1">
        <span
          className={`block font-bold leading-snug transition-colors ${
            compact ? "line-clamp-3 text-[13.5px]" : "text-[15px]"
          } ${
            dark
              ? "text-white group-hover:text-red-300"
              : "text-neutral-950 group-hover:text-[#CF1A1E]"
          }`}
        >
          {headline}
        </span>
        {timeAgo ? (
          <span
            className={`mt-1.5 block text-[12px] ${
              dark ? "text-white/45" : "text-neutral-400"
            }`}
          >
            {timeAgo}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
