// components/stories/stories/recommended-card.tsx
"use client";
import Link from "next/link";
import { ArticleSummary } from "@/types/article";

export function RecommendedCard({ article }: { article: ArticleSummary }) {
  // 🧠 Determine Branding based on tags or category
  const hasVenturaTag = article.tags?.some(
    (t: any) => t.slug === "ventura-county",
  );
  const isVentura =
    hasVenturaTag || article.category?.toLowerCase().includes("ventura");

  const path = isVentura ? `/ventura/${article.slug}` : `/${article.slug}`;
  const theme = isVentura
    ? { badge: "bg-orange-600", text: "group-hover:text-orange-600" }
    : { badge: "bg-red-600", text: "group-hover:text-blue-900" };

  return (
    <Link href={path} className="group flex gap-3 items-start w-full">
      {/* Small Horizontal Thumbnail */}
      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md bg-neutral-100">
        <img
          src={article.coverImageUrl ?? "/placeholder.jpg"}
          alt={article.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <span
          className={`${theme.badge} text-white px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-sm w-fit`}
        >
          {article.category}
        </span>

        <h4
          className={`text-sm font-bold leading-tight text-neutral-900 line-clamp-2 transition-colors ${theme.text}`}
        >
          {article.title}
        </h4>
      </div>
    </Link>
  );
}
