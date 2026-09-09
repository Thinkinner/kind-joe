// app/ventura-county/page.tsx
"use client";

import React, { useEffect, useState, useTransition } from "react";
import { VenturaArticleCard } from "@/components/cards/ventura-article-card";
import { Skeleton } from "@/components/ui/skeleton";
import { SocialWidget } from "@/components/ventura-county/social-widget";
import { CouncilTeaEmbed } from "@/components/ventura-county/council-tea-embed";
import { JoesFriendsPromo } from "@/components/ads/joes-friends-promo";
import { getVenturaArticlesAction } from "@/lib/actions/articles";
import { ArticleSummary } from "@/types/article";
import { Loader2, ChevronDown } from "lucide-react";

const BATCH_SIZE = 9;

export default function VenturaCountyPage() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [hasMore, setHasMore] = useState(true);

  // Initial Load
  useEffect(() => {
    async function init() {
      const data = await getVenturaArticlesAction(BATCH_SIZE, 0);
      setArticles(data);
      if (data.length < BATCH_SIZE) setHasMore(false);
      setLoadingInitial(false);
    }
    init();
  }, []);

  // Load More Logic
  const handleLoadMore = () => {
    startTransition(async () => {
      const newData = await getVenturaArticlesAction(
        BATCH_SIZE,
        articles.length,
      );
      if (newData.length < BATCH_SIZE) setHasMore(false);
      setArticles((prev) => [...prev, ...newData]);
    });
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <main className="mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 border-b border-orange-100 pb-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-12 w-72 max-w-full" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <Skeleton className="h-8 w-32 rounded-full" />
          </div>

          <div className="flex flex-col items-start gap-10 lg:flex-row">
            <div className="flex-1 w-full">
              <div className="grid grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 9 }).map((_, idx) => (
                  <div key={idx} className="space-y-3">
                    <Skeleton className="aspect-[16/10] w-full rounded-xl" />
                    <Skeleton className="h-5 w-[90%]" />
                    <Skeleton className="h-4 w-[70%]" />
                  </div>
                ))}
              </div>
            </div>

            <aside className="w-full shrink-0 lg:w-[350px] xl:w-[400px]">
              <Skeleton className="h-72 w-full rounded-2xl" />
            </aside>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 border-b border-orange-100 pb-6 gap-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-neutral-900 font-[Poppins] tracking-tight">
              Ventura <span className="text-orange-600">County</span>
            </h1>
            <p className="text-neutral-500 font-medium mt-2">
              Local news, events, and featured stories.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-600"></span>
            </span>
            Live Updates
          </div>
        </div>

        <JoesFriendsPromo variant="compact" className="mb-8 lg:hidden" />

        {/* Main Content Layout */}
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* Left: Article Feed */}
          <div className="flex-1 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-10">
              {articles.map((article) => (
                <VenturaArticleCard key={article.id} article={article} />
              ))}
            </div>

            {/* Smart Pagination Button */}
            {hasMore && (
              <div className="mt-16 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isPending}
                  className="flex items-center gap-3 px-10 py-4 bg-white border-2 border-orange-600 text-orange-600 font-black uppercase tracking-widest text-xs rounded-full hover:bg-orange-600 hover:text-white transition-all shadow-lg shadow-orange-200 disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}
                  {isPending ? "Fetching..." : "Load More Stories"}
                </button>
              </div>
            )}

            {!hasMore && (
              <div className="mt-16 text-center">
                <p className="text-neutral-400 text-sm font-medium italic">
                  You're all caught up with Ventura County.
                </p>
              </div>
            )}
          </div>

          {/* Right: Sticky Sidebar */}
          <aside className="hidden w-full shrink-0 self-start lg:sticky lg:top-24 lg:block lg:w-[350px] xl:w-[400px]">
            <div className="flex flex-col gap-8">
              <JoesFriendsPromo />
              <CouncilTeaEmbed />
              <SocialWidget />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
