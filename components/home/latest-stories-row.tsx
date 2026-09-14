import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { StoryListRow } from "@/components/home/story-list-row";
import {
  articlePublicPath,
  articleShowsMainImage,
} from "@/lib/brand/article-theme";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary/url";
import { formatHeadline } from "@/lib/format/headline";
import { formatTimeAgo } from "@/lib/format/time-ago";
import { regionLabelForArticle } from "@/lib/local-news/region-label";
import type { ArticleSummary } from "@/types/article";

export function LatestStoriesRow({ articles }: { articles: ArticleSummary[] }) {
  if (articles.length === 0) return null;

  return (
    <section aria-labelledby="latest-stories-heading">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-neutral-900 pb-3">
        <h2
          id="latest-stories-heading"
          className="text-xl font-bold tracking-tight text-neutral-950 sm:text-2xl"
        >
          Latest
        </h2>
        <Link
          href="/news"
          className="group inline-flex items-center gap-1 text-sm font-semibold text-neutral-600 transition-colors hover:text-[#CF1A1E]"
        >
          View all
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      <ul className="divide-y divide-neutral-200 md:hidden">
        {articles.map((article) => (
          <li key={article.id}>
            <StoryListRow article={article} />
          </li>
        ))}
      </ul>

      <div className="hidden grid-cols-1 gap-6 sm:grid-cols-2 md:grid lg:grid-cols-4">
        {articles.map((article) => {
          const path = articlePublicPath(article.slug);
          const headline = formatHeadline(article.title);
          const kicker = regionLabelForArticle(article);
          const timeAgo = formatTimeAgo(article.publishedAt ?? null);
          const showImage = articleShowsMainImage(article);
          const image = showImage
            ? optimizeCloudinaryUrl(article.coverImageUrl ?? "/placeholder.jpg", {
                width: 640,
              })
            : null;

          return (
            <Link key={article.id} href={path} className="group min-w-0">
              {showImage && image ? (
                <div className="relative aspect-[16/10] overflow-hidden bg-neutral-200">
                  <Image
                    src={image}
                    alt={headline}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
              ) : null}
              <div className={showImage ? "mt-3" : ""}>
                <p className="mb-1 flex flex-wrap items-center gap-x-2 text-[11px] font-medium text-neutral-500">
                  {kicker ? (
                    <span className="font-semibold text-[#CF1A1E]">{kicker}</span>
                  ) : null}
                  {kicker && timeAgo ? (
                    <span className="text-neutral-300">·</span>
                  ) : null}
                  {timeAgo ? <span>{timeAgo}</span> : null}
                </p>
                <h3 className="text-[15px] font-semibold leading-snug text-neutral-950 transition-colors group-hover:text-[#CF1A1E]">
                  {headline}
                </h3>
                {!showImage && article.excerpt ? (
                  <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-neutral-500">
                    {article.excerpt}
                  </p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
