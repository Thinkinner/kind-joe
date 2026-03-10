"use client";

import { useEffect, useState, useTransition } from "react";
import { ArticleSummary } from "@/types/article";
import { ArticleCard } from "./article-card";
import { getArticlesAction } from "@/lib/actions/articles"; // Import the action
import { Loader2, Plus } from "lucide-react";

const BATCH_SIZE = 9; // 3x3 grid looks nice

export function ArticleList() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [hasMore, setHasMore] = useState(true);

  // Initial Load using the Action
  useEffect(() => {
    async function initLoad() {
      const data = await getArticlesAction(BATCH_SIZE, 0);
      setArticles(data);
      if (data.length < BATCH_SIZE) setHasMore(false);
      setLoadingInitial(false);
    }
    initLoad();
  }, []);

  const handleLoadMore = () => {
    // startTransition keeps the UI responsive while fetching
    startTransition(async () => {
      const currentOffset = articles.length;
      const newData = await getArticlesAction(BATCH_SIZE, currentOffset);

      if (newData.length === 0 || newData.length < BATCH_SIZE) {
        setHasMore(false);
      }

      setArticles((prev) => [...prev, ...newData]);
    });
  };

  if (loadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-red-600" size={40} />
        <p className="text-sm text-gray-500 font-medium animate-pulse">
          Loading latest stories...
        </p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed rounded-xl">
        <p className="text-gray-500">No articles found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      {/* Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      {/* Pagination Trigger */}
      {hasMore && (
        <div className="flex justify-center pb-10">
          <button
            onClick={handleLoadMore}
            disabled={isPending}
            className="group relative flex items-center gap-2 px-10 py-4 bg-slate-950 text-white rounded-full font-bold transition-all hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-slate-950 overflow-hidden"
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <Plus
                  size={20}
                  className="group-hover:rotate-90 transition-transform"
                />
                <span>Show More Articles</span>
              </>
            )}
          </button>
        </div>
      )}

      {!hasMore && (
        <div className="flex items-center justify-center gap-4 py-10">
          <div className="h-px bg-gray-200 flex-1" />
          <p className="text-sm text-gray-400 font-medium italic">
            End of featured articles
          </p>
          <div className="h-px bg-gray-200 flex-1" />
        </div>
      )}
    </div>
  );
}
