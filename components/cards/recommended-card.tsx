// components/stories/stories/recommended-card.tsx
"use client";
import Link from "next/link";
import { ArticleSummary } from "@/types/article";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary/url";

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
    <Link
      href={path}
      className="group flex w-full items-start gap-3 border-b border-neutral-200 py-2.5 transition"
    >
      {/* Small Horizontal Thumbnail */}
      <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-md bg-neutral-100 sm:w-28">
        <img
          src={optimizeCloudinaryUrl(article.coverImageUrl ?? "/placeholder.jpg", {
            width: 320,
          })}
          alt={article.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </div>

      <div className="min-w-0 flex flex-col gap-1">
        <span
          className={`${theme.badge} text-white px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-sm w-fit`}
        >
          {article.category}
        </span>

        <h4
          className={`text-sm font-bold leading-snug text-neutral-900 line-clamp-3 transition-colors ${theme.text}`}
        >
          {article.title}
        </h4>
      </div>
    </Link>
  );
}
