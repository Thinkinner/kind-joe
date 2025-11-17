"use client";

import Link from "next/link";
import { ArticleSummary } from "@/types/article";

type Props = {
  article: ArticleSummary;
};

export function ArticleCard({ article }: Props) {
  const dateObj = article.publishedAt ? new Date(article.publishedAt) : null;

  // Format using Los Angeles timezone
  const laFormatter = dateObj
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        day: "2-digit",
        month: "short",
      }).formatToParts(dateObj)
    : [];

  const day = laFormatter.find(p => p.type === "day")?.value ?? "";
  const month = laFormatter.find(p => p.type === "month")?.value ?? "";

  return (
    <div
      className="relative w-full flex items-end justify-start text-left bg-cover bg-center rounded-xl overflow-hidden"
      style={{
        height: 320,
        backgroundImage: `url(${article.coverImageUrl ?? "/placeholder.jpg"})`,
      }}
    >
      {/* Dark gradient overlay */}
      <div className="absolute top-0 mt-20 right-0 bottom-0 left-0 bg-gradient-to-b from-transparent to-gray-900"></div>

      {/* Category + Date */}
      <div className="absolute top-0 right-0 left-0 mx-5 mt-2 flex justify-between items-center">
        {/* CATEGORY */}
        <span className="text-xs font-medium bg-red-700 text-white px-2 py-2 rounded hover:bg-white hover:text-red-600 transition duration-500">
          {article.category}
        </span>

        {/* DATE (LA Time) */}
        {/* {dateObj && (
          <div className="text-white flex flex-col text-right">
            <span className="text-3xl leading-none font-semibold text-shadow-lg">{day}</span>
            <span className="-mt-2 text-shadow-lg">{month}</span>
          </div>
        )} */}
      </div>

      {/* Title */}
      <main className="p-5 z-10">
        <Link
          href={`/${article.slug}`}
          className="text-md tracking-tight font-medium leading-7 text-white hover:underline"
        >
          {article.title}
        </Link>
      </main>
    </div>
  );
}
