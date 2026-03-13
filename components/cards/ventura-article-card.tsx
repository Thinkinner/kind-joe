"use client";

import Link from "next/link";

export function VenturaArticleCard({ article }: { article: any }) {
  // Always route to the article slug
  const path = `/${article.slug}`;

  return (
    <Link
      href={path}
      className="group flex flex-row items-start gap-4 w-full rounded-md md:flex-col md:gap-0"
    >
      {/* IMAGE */}
      {/* 
          aspect-[3/4] on mobile (33% width)
          md:aspect-[16/9] on desktop (100% width)
      */}
      <div className="relative aspect-[4/3] w-1/3 md:aspect-[16/9] md:w-full flex-shrink-0 overflow-hidden rounded-md">
        <img
          src={article.coverImageUrl ?? "/placeholder.jpg"}
          alt={article.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* CONTENT */}
      <div className="flex flex-col gap-1 py-1 md:pt-3 md:pb-4 md:gap-2">
        <div className="flex items-center">
          <span className="bg-orange-600 text-white px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm">
            {article.category}
          </span>
        </div>

        <h3 className="font-poppins text-sm md:text-lg font-bold leading-snug text-neutral-900 transition-colors group-hover:text-orange-600 group-hover:underline underline-offset-2 line-clamp-3">
          {article.title}
        </h3>
      </div>
    </Link>
  );
}
