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

  const day = laFormatter.find((p) => p.type === "day")?.value ?? "";
  const month = laFormatter.find((p) => p.type === "month")?.value ?? "";

  return (
    <Link href={`/${article.slug}`} className="block w-full">
      <div
        className="group relative w-full flex items-end justify-start text-left rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-500"
        style={{ height: 320 }}
      >
        {/* 1. BACKGROUND IMAGE LAYER (Separated for Zoom Effect) */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110"
          style={{
            backgroundImage: `url(${article.coverImageUrl ?? "/placeholder.jpg"})`,
          }}
        />

        {/* 2. DARK GRADIENT OVERLAY */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent/20 to-gray-900 transition-opacity duration-500 group-hover:opacity-90"></div>

        {/* 3. CONTENT LAYER (Relative to sit on top) */}
        <div className="relative z-10 w-full h-full flex flex-col justify-between">
          {/* Top Section: Category + Date */}
          <div className="mx-5 mt-5 flex justify-between items-center">
            {/* CATEGORY */}
            <span className="text-xs font-medium bg-red-700 text-white px-2 py-2 rounded shadow-sm group-hover:bg-white group-hover:text-red-600 transition-colors duration-300">
              {article.category}
            </span>

            {/* DATE (LA Time) - Uncomment if needed */}
            {/* {dateObj && (
              <div className="text-white flex flex-col text-right drop-shadow-md">
                <span className="text-3xl leading-none font-semibold">{day}</span>
                <span className="-mt-1 text-sm font-medium uppercase">{month}</span>
              </div>
            )} */}
          </div>

          {/* Bottom Section: Title */}
          <main className="p-5">
            <h3 className="text-md tracking-tight font-medium leading-7 text-white transition-colors duration-300 group-hover:text-red-50 group-hover:underline decoration-red-500/50 underline-offset-4">
              {article.title}
            </h3>
          </main>
        </div>
      </div>
    </Link>
  );
}