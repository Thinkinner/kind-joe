"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ArticleContent from "@/components/stories/article-single-page-content";
import { resolveArticleDisplayContent } from "@/lib/content/resolve-article-content-markdown";
import { ArticlePredictionCta } from "@/components/stories/article-prediction-cta";
import LocalizedPublishTime from "@/components/stories/localized-publish-time";
import ShareButtons from "@/components/stories/share-buttons";
import { ScrollToArticleCta } from "@/components/stories/scroll-to-article-cta";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary/url";
import {
  appendBackTaxesCtaHtml,
  appendBackTaxesCtaMarkdown,
} from "@/lib/content/back-taxes-cta";
import type { PredictionMarketView } from "@/lib/predictions/queries";

type RelatedChainItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: unknown;
  contentMarkdown: string | null;
  contentHtml: string | null;
  seo: unknown;
  predictionId: number | null;
  authorAvatar: string | null;
  hasVenturaTag: boolean;
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

const SESSION_SEEN_KEY = "related-chain-seen-ids";

function readSessionSeenIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(SESSION_SEEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string" && value.length > 0);
  } catch {
    return [];
  }
}

function writeSessionSeenIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    // Keep only the latest chunk to avoid unbounded growth.
    const payload = Array.from(ids).slice(-120);
    window.sessionStorage.setItem(SESSION_SEEN_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
}

function parseSeo(
  value: unknown,
): {
  authorName?: string;
  bylineSource?: string;
} {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object") {
        return parsed as { authorName?: string; bylineSource?: string };
      }
      return {};
    } catch {
      return {};
    }
  }
  if (typeof value === "object") {
    return value as { authorName?: string; bylineSource?: string };
  }
  return {};
}

type Props = {
  slug: string;
  articleId: string;
  className?: string;
  title?: string;
  canCreatePredictions?: boolean;
  primaryArticleElementId?: string;
};

export default function ArticleRelatedChain({
  slug,
  articleId,
  className,
  title: _title = "Continue Reading",
  canCreatePredictions = false,
  primaryArticleElementId = "article-content",
}: Props) {
  const [items, setItems] = useState<RelatedChainItem[]>([]);
  const [cursor, setCursor] = useState<number>(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [origin, setOrigin] = useState("");
  const [marketsByArticleId, setMarketsByArticleId] = useState<
    Record<string, PredictionMarketView | null>
  >({});
  const seenRef = useRef<Set<string>>(new Set([articleId]));
  const loadingPredictionRef = useRef<Set<string>>(new Set());
  const loadedAtHalfRef = useRef<Set<string>>(new Set());
  const relatedArticleRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const merged = new Set([...readSessionSeenIds(), articleId]);
    seenRef.current = merged;
    writeSessionSeenIds(merged);
  }, [articleId]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const seenParam = Array.from(seenRef.current).join(",");
      const res = await fetch(
        `/api/articles/${slug}/related-chain?cursor=${cursor}&limit=3&seen=${encodeURIComponent(seenParam)}`,
        { cache: "no-store" },
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const payload = (await res.json()) as ChainResponse;

      setLoadedOnce(true);
      setHasMore(payload.hasMore);
      setCursor(payload.nextCursor ?? cursor);

      setItems((prev) => {
        const existing = new Set(prev.map((item) => item.id));
        const merged = [...prev];
        for (const item of payload.items) {
          if (existing.has(item.id)) continue;
          existing.add(item.id);
          merged.push(item);
          seenRef.current.add(item.id);
        }
        writeSessionSeenIds(seenRef.current);
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
    if (typeof window === "undefined") return;

    let rafId: number | null = null;

    const checkHalfwayProgress = () => {
      if (!hasMore || loading) return;

      const scrollBottom = window.scrollY + window.innerHeight;
      const rootEl = document.getElementById(primaryArticleElementId);
      const targets: Array<{ key: string; element: HTMLElement | null }> = [
        { key: `root:${articleId}`, element: rootEl },
        ...items.map((item) => ({ key: item.id, element: relatedArticleRefs.current[item.id] ?? null })),
      ];

      for (const target of targets) {
        if (!target.element) continue;
        if (loadedAtHalfRef.current.has(target.key)) continue;

        const rect = target.element.getBoundingClientRect();
        const absoluteTop = rect.top + window.scrollY;
        const halfwayPoint = absoluteTop + target.element.offsetHeight * 0.5;

        if (scrollBottom >= halfwayPoint) {
          loadedAtHalfRef.current.add(target.key);
          void loadMore();
          break;
        }
      }
    };

    const scheduleCheck = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        checkHalfwayProgress();
      });
    };

    scheduleCheck();
    window.addEventListener("scroll", scheduleCheck, { passive: true });
    window.addEventListener("resize", scheduleCheck);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", scheduleCheck);
      window.removeEventListener("resize", scheduleCheck);
    };
  }, [articleId, hasMore, items, loadMore, loading, primaryArticleElementId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    for (const item of items) {
      if (typeof item.predictionId !== "number" || !Number.isFinite(item.predictionId)) {
        if (!(item.id in marketsByArticleId)) {
          setMarketsByArticleId((prev) => ({ ...prev, [item.id]: null }));
        }
        continue;
      }
      if (item.id in marketsByArticleId) continue;
      if (loadingPredictionRef.current.has(item.id)) continue;
      loadingPredictionRef.current.add(item.id);

      void fetch(`/api/predictions/${item.predictionId}`, { cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) return null;
          const payload = (await res.json()) as { market?: PredictionMarketView | null };
          return payload.market ?? null;
        })
        .catch(() => null)
        .then((market) => {
          setMarketsByArticleId((prev) => ({ ...prev, [item.id]: market }));
        })
        .finally(() => {
          loadingPredictionRef.current.delete(item.id);
        });
    }
  }, [items, marketsByArticleId]);

  if (!loadedOnce && loading) {
    return (
      <section className={className}>
        <div className="space-y-3">
          <div className="h-48 animate-pulse rounded-lg bg-neutral-100" />
          <div className="h-48 animate-pulse rounded-lg bg-neutral-100" />
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className={className}>
      <div className="space-y-14">
        {items.map((item) => {
          const { contentMarkdown, contentDoc, preferLegacyDoc } =
            resolveArticleDisplayContent({
              contentMarkdown: item.contentMarkdown,
              content: item.content,
              contentHtml: item.contentHtml,
            });
          const hasBody = Boolean(contentMarkdown?.trim() || contentDoc?.content?.length);
          const displayMarkdown = contentMarkdown?.trim()
            ? appendBackTaxesCtaMarkdown(contentMarkdown)
            : contentMarkdown;
          const seo = parseSeo(item.seo);
          const bylineAlias =
            seo.bylineSource === "alias" ? (seo.authorName?.trim() ?? "") : "";
          const useAliasByline = bylineAlias.length > 0;
          const isVenturaArticle = item.hasVenturaTag;
          const defaultPublisherName = isVenturaArticle ? "Joe Knows Ventura" : "KindJoe";
          const publisherName = useAliasByline ? bylineAlias : defaultPublisherName;
          const publisherAvatar = isVenturaArticle
            ? "/brand/ventura-profile.jpg"
            : "/brand/kindjoe-profile.jpg";
          const publisherInitials =
            publisherName
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? "")
              .join("") || "KJ";
          const predictionSectionId = `related-article-predictions-${item.id}`;
          const shareUrl = origin ? `${origin}${item.href}` : item.href;
          return (
            <article
              key={item.id}
              ref={(node) => {
                relatedArticleRefs.current[item.id] = node;
              }}
              className="border-t border-neutral-200 pt-8"
            >
              {item.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={optimizeCloudinaryUrl(item.coverImageUrl, { width: 1400 })}
                  alt={item.title}
                  className="mb-5 aspect-[16/9] w-full rounded-xl object-cover"
                />
              ) : null}
              <header>
                <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-neutral-900 sm:text-4xl">
                  {item.title}
                </h2>

                <div className="mt-6 border-y border-neutral-200 py-4 sm:py-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 flex-shrink-0">
                          {useAliasByline ? (
                            <div
                              aria-label={publisherName}
                              className="flex h-full w-full items-center justify-center rounded-full bg-neutral-900 text-sm font-bold tracking-wide text-white ring-2 ring-white shadow-sm"
                            >
                              {publisherInitials}
                            </div>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.authorAvatar || publisherAvatar}
                              alt={publisherName}
                              className="h-full w-full rounded-full object-cover ring-2 ring-white shadow-sm"
                            />
                          )}
                          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white ring-2 ring-white">
                            <svg
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-3 h-3"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-neutral-900 leading-none">
                            {publisherName}
                          </span>
                          <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500 font-medium">
                            <span>Official Publisher</span>
                            <span className="h-1 w-1 rounded-full bg-neutral-300"></span>
                            <LocalizedPublishTime
                              value={item.publishedAt ?? item.publishAt}
                              className="text-neutral-700 font-semibold"
                            />
                            {item.readingMinutes ? (
                              <>
                                <span className="h-1 w-1 rounded-full bg-neutral-300"></span>
                                <span>{item.readingMinutes} min read</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <p className="hidden text-xs font-semibold uppercase tracking-wide text-neutral-400 sm:block">
                        Community
                      </p>
                    </div>

                    <div className="h-px w-full bg-neutral-200" />

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">
                          Join the conversation
                        </p>
                        <p className="text-xs text-neutral-500">
                          React with your take and see what people think below.
                        </p>
                      </div>
                      <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
                        <ScrollToArticleCta
                          targetId={predictionSectionId}
                          label="Share your take"
                          className="w-full sm:w-auto"
                        />
                        <ShareButtons
                          url={shareUrl}
                          showLabel={false}
                          className="w-full justify-start sm:w-auto sm:justify-end"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </header>

              {item.excerpt && (
                <p className="mt-4 text-sm leading-relaxed text-neutral-700">{item.excerpt}</p>
              )}

              <div className="mt-8 tiptap prose prose-lg prose-neutral max-w-none prose-headings:font-bold prose-a:text-red-600">
                  {hasBody ? (
                    <ArticleContent
                      markdown={displayMarkdown}
                      value={contentDoc}
                      preferLegacyDoc={preferLegacyDoc}
                    />
                  ) : null}
                  {!contentMarkdown?.trim() ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: appendBackTaxesCtaHtml(""),
                      }}
                    />
                  ) : null}
                </div>

              <div id={predictionSectionId}>
                <ArticlePredictionCta
                  articleSlug={item.slug}
                  market={marketsByArticleId[item.id] ?? null}
                  canCreate={canCreatePredictions}
                />
              </div>
            </article>
          );
        })}
      </div>

      <div className="h-12 pt-4">
        {loading ? (
          <p className="text-xs text-neutral-500">Loading the next full story...</p>
        ) : hasMore ? (
          <p className="text-xs text-neutral-400">Keep reading to 50% and we load the next story</p>
        ) : (
          <p className="text-xs text-neutral-400">You are all caught up.</p>
        )}
      </div>
    </section>
  );
}

