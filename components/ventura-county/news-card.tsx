import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArticleCard } from "@/types/article";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary/url";

interface NewsCardProps {
  article: ArticleCard;
}

export const NewsCard: React.FC<NewsCardProps> = ({ article }) => {
  return (
    <Link
      href={article.url}
      className="group block w-full rounded-md overflow-hidden transition-shadow duration-300"
    >
      {/* IMAGE (EDGE TO EDGE, SCALE ON HOVER, GRADIENT OVERLAY) */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md">
        <Image
          src={optimizeCloudinaryUrl(article.imageUrl, { width: 1200 })}
          alt={article.headline}
          fill
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* CONTENT (CLEANER SPACING, MATCHING STYLE) */}
      <div className="pt-3 pb-4 flex flex-col gap-2 px-1">

        {/* CATEGORY TAG (RED STYLE LIKE EXAMPLE) */}
        <div className="flex items-center justify-between text-xs font-semibold tracking-wide uppercase">
          <span className="bg-orange-600 text-white px-2 py-0.5 font-semibold">
            {article.category}
          </span>
        </div>

        {/* HEADLINE (HOVER UNDERLINE + BLUE, CLEANER) */}
        <h2 className="font-poppins text-lg font-bold leading-snug text-neutral-900 line-clamp-3 transition-colors group-hover:text-blue-900 group-hover:underline underline-offset-2 pt-1 pb-1 md:text-xl">
          {article.headline}
        </h2>

      </div>
    </Link>
  );
};