"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { ArticleSummary } from "@/types/article";
import { ArticleCard } from "./article-card";
import {
  getArticlesAction,
  getArticlesByTopicAction,
} from "@/lib/actions/articles";
import { Loader2, Plus } from "lucide-react";
import type { TopicSlug } from "@/lib/content/topics";

const BATCH_SIZE = 9; // 3x3 grid looks nice

type ArticleListProps = {
  topic?: TopicSlug;
  emptyMessage?: string;
  columns?: 2 | 3;
  cardVariant?: "default" | "elevated";
};

export function ArticleList({
  topic,
  emptyMessage = "No articles found.",
  columns = 3,
  cardVariant = "default",
}: ArticleListProps = {}) {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [hasMore, setHasMore] = useState(true);

  const loadBatch = useCallback(
    async (offset: number) => {
      if (topic) {
        return getArticlesByTopicAction(BATCH_SIZE, offset, topic);
      }
      return getArticlesAction(BATCH_SIZE, offset);
    },
    [topic],
  );

  // Initial Load using the Action
  useEffect(() => {
    async function initLoad() {
      const data = await loadBatch(0);
      setArticles(data);
      if (data.length < BATCH_SIZE) setHasMore(false);
      setLoadingInitial(false);
    }
    initLoad();
  }, [loadBatch]);

  const handleLoadMore = () => {
    // startTransition keeps the UI responsive while fetching
    startTransition(async () => {
      const currentOffset = articles.length;
      const newData = await loadBatch(currentOffset);

      if (newData.length === 0 || newData.length < BATCH_SIZE) {
        setHasMore(false);
      }

      setArticles((prev) => [...prev, ...newData]);
    });
  };

  const gridClass =
    cardVariant === "elevated"
      ? columns === 2
        ? "grid w-full min-w-0 grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-8"
        : "grid w-full min-w-0 grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-8 xl:grid-cols-3"
      : columns === 2
        ? "grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2"
        : "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3";

  const containerClass = gridClass;

  if (loadingInitial) {
    return (
      <div className={containerClass}>
        {Array.from({ length: cardVariant === "elevated" ? 6 : columns === 2 ? 4 : 6 }).map((_, i) => (
          <div
            key={i}
            className={
              cardVariant === "elevated"
                ? "flex animate-pulse flex-col gap-3"
                : "h-64 rounded-2xl bg-slate-100 sm:h-72"
            }
            aria-hidden
          >
            {cardVariant === "elevated" ? (
              <>
                <div className="aspect-[16/10] w-full rounded-lg bg-slate-100" />
                <div className="flex flex-col gap-2">
                  <div className="h-3 w-20 rounded bg-slate-100" />
                  <div className="h-4 w-full rounded bg-slate-100" />
                  <div className="h-4 w-[75%] rounded bg-slate-100" />
                </div>
              </>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
        <p className="text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-10">
      <div className={containerClass}>
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} variant={cardVariant} />
        ))}
      </div>

      {/* Pagination Trigger */}
      {hasMore && (
        <div className="flex justify-center pb-10">
          <button
            onClick={handleLoadMore}
            disabled={isPending}
            className="group relative flex w-full max-w-xs items-center justify-center gap-2 overflow-hidden rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-red-600 disabled:opacity-50 sm:w-auto sm:max-w-none sm:px-8 sm:py-3.5"
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
