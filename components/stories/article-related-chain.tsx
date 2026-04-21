"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type RelatedChainItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  readingMinutes: number | null;
  publishedAt: string | null;
  publishAt: string | null;
  category: string | null;
  score: number;
  semanticSimilarity: number;
  href: string;
};

type ChainResponse = {
  items: RelatedChainItem[];
  hasMore: boolean;
  nextCursor: number | null;
  source: "semantic" | "fallback";
};

function formatDate(input: string | null): string | null {
  if (!input) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function sendRelatedEvent(input: {
  eventType: "impression" | "click" | "scroll_load";
  articleId: string;
  sourceArticleId: string;
}) {
  const payload = JSON.stringify({
    eventType: input.eventType,
    articleId: input.articleId,
    sourceArticleId: input.sourceArticleId,
    referrer: typeof window !== "undefined" ? window.location.pathname : null,
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/articles/track-related", payload);
      return;
    }
  } catch {
    // Ignore and fallback to fetch below.
  }

  void fetch("/api/articles/track-related", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  });
}

type Props = {
  slug: string;
  articleId: string;
  className?: string;
  title?: string;
};

export default function ArticleRelatedChain({
  slug,
  articleId,
  className,
  title = "Continue Reading",
}: Props) {
  const [items, setItems] = useState<RelatedChainItem[]>([]);
  const [cursor, setCursor] = useState<number>(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [sourceType, setSourceType] = useState<"semantic" | "fallback" | null>(null);
  const seenRef = useRef<Set<string>>(new Set([articleId]));
  const impressionRef = useRef<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const seenParam = Array.from(seenRef.current).join(",");
      const res = await fetch(
        `/api/articles/${slug}/related-chain?cursor=${cursor}&limit=2&seen=${encodeURIComponent(seenParam)}`,
        { cache: "no-store" },
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const payload = (await res.json()) as ChainResponse;

      setLoadedOnce(true);
      setHasMore(payload.hasMore);
      setCursor(payload.nextCursor ?? cursor);
      setSourceType(payload.source);

      if (payload.items.length > 0) {
        sendRelatedEvent({
          eventType: "scroll_load",
          articleId: payload.items[0].id,
          sourceArticleId: articleId,
        });
      }

      setItems((prev) => {
        const existing = new Set(prev.map((item) => item.id));
        const merged = [...prev];
        for (const item of payload.items) {
          if (existing.has(item.id)) continue;
          existing.add(item.id);
          merged.push(item);
          seenRef.current.add(item.id);
        }
        return merged;
      });
    } catch (error) {
      console.error("[related-chain] load failed", error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [articleId, cursor, hasMore, loading, slug]);

  useEffect(() => {
    void loadMore();
  }, [loadMore]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "220px 0px 220px 0px", threshold: 0.1 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  useEffect(() => {
    for (const item of items) {
      if (impressionRef.current.has(item.id)) continue;
      impressionRef.current.add(item.id);
      sendRelatedEvent({
        eventType: "impression",
        articleId: item.id,
        sourceArticleId: articleId,
      });
    }
  }, [articleId, items]);

  if (!loadedOnce && loading) {
    return (
      <section className={className}>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-900">
          {title}
        </h3>
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-lg bg-neutral-100" />
          <div className="h-20 animate-pulse rounded-lg bg-neutral-100" />
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className={className}>
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-neutral-200 pb-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-900">{title}</h3>
        {sourceType && (
          <span className="text-[11px] uppercase tracking-wide text-neutral-500">
            {sourceType === "semantic" ? "AI picked" : "Latest picks"}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const date = formatDate(item.publishedAt ?? item.publishAt);
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() =>
                sendRelatedEvent({
                  eventType: "click",
                  articleId: item.id,
                  sourceArticleId: articleId,
                })
              }
              className="group flex gap-3 rounded-lg border border-neutral-200 p-3 transition hover:border-red-400 hover:bg-neutral-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.coverImageUrl ?? "/placeholder.jpg"}
                alt={item.title}
                className="h-20 w-20 flex-shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900 group-hover:text-red-600">
                  {item.title}
                </p>
                {item.excerpt && (
                  <p className="mt-1 line-clamp-2 text-xs text-neutral-600">{item.excerpt}</p>
                )}
                <div className="mt-2 flex items-center gap-2 text-[11px] text-neutral-500">
                  {date && <span>{date}</span>}
                  {item.readingMinutes ? (
                    <>
                      <span>•</span>
                      <span>{item.readingMinutes} min read</span>
                    </>
                  ) : null}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div ref={sentinelRef} className="h-12 pt-4">
        {loading ? (
          <p className="text-xs text-neutral-500">Loading the next story...</p>
        ) : hasMore ? (
          <p className="text-xs text-neutral-400">Scroll to load more related stories</p>
        ) : (
          <p className="text-xs text-neutral-400">You are all caught up.</p>
        )}
      </div>
    </section>
  );
}

