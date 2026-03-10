// components/stories/stories/article-card.tsx
"use client";

import Link from "next/link";

export function ArticleCard({ article }: { article: any }) {
  // 🧠 Check if "ventura-county" exists in the tags array
  const hasVenturaTag = article.tags?.some(
    (t: any) => t.slug === "ventura-county",
  );

  // Determine Route
  const path = hasVenturaTag ? `/ventura/${article.slug}` : `/${article.slug}`;

  // Determine Colors
  const brandColor = hasVenturaTag ? "bg-orange-600" : "bg-red-600";
  const hoverColor = hasVenturaTag
    ? "group-hover:text-orange-600"
    : "group-hover:text-blue-900";

  return (
    <Link href={path} className="group block w-full rounded-md overflow-hidden">
      {/* IMAGE */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md">
        <img
          src={article.coverImageUrl ?? "/placeholder.jpg"}
          alt={article.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* CONTENT */}
      <div className="pt-3 pb-4 flex flex-col gap-2">
        <div className="flex items-center">
          <span
            className={`${brandColor} text-white px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm`}
          >
            {article.category}
          </span>
        </div>

        <h3
          className={`font-poppins text-lg font-bold leading-snug text-neutral-900 transition-colors ${hoverColor} group-hover:underline underline-offset-2`}
        >
          {article.title}
        </h3>
      </div>
    </Link>
  );
}
