"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Search, X, Loader2, ArrowRight, RefreshCw, Globe } from "lucide-react";
import { RawRssItem, NewsletterStory } from "@/lib/(newsletter-automations)/types";
import { generateStoryFromSelectedArticle } from "@/lib/(newsletter-automations)/gemini-service";
import { getFreshNewsRssArticlesForNewsletter } from "@/lib/(newsletter-automations)/storage-services";

interface ArticleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourcePool?: RawRssItem[];
  currentStories: NewsletterStory[];
  targetSlotName: string;
  onStoryGenerated: (newStory: NewsletterStory) => void;
}

export default function ArticleSelectionModal({
  isOpen,
  onClose,
  sourcePool,
  currentStories,
  targetSlotName,
  onStoryGenerated,
}: ArticleSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingLive, setIsFetchingLive] = useState(false);

  const [localPool, setLocalPool] = useState<RawRssItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setLocalPool(sourcePool || []);
      setSearchQuery("");
    }
  }, [isOpen, sourcePool]);

  const handleRefreshFromIngest = async () => {
    setIsFetchingLive(true);
    try {
      const freshItems = await getFreshNewsRssArticlesForNewsletter();
      setLocalPool(freshItems);
    } catch (error) {
      console.error("Failed to load ingest articles", error);
      alert("Could not load articles from news_rss_articles. Check console.");
    } finally {
      setIsFetchingLive(false);
    }
  };

  const unusedArticles = useMemo(() => {
    const safePool = localPool || [];
    const safeStories = currentStories || [];
    const usedUrls = new Set(safeStories.map((s) => s?.sourceUrl));
    return safePool.filter((article) => article && !usedUrls.has(article.link));
  }, [localPool, currentStories]);

  const filteredArticles = useMemo(() => {
    if (!searchQuery) return unusedArticles;
    const lowerQuery = searchQuery.toLowerCase();
    return unusedArticles.filter((article) => {
      const title = article?.title || "";
      const sourceName = article?.sourceName || "";
      return (
        title.toLowerCase().includes(lowerQuery) ||
        sourceName.toLowerCase().includes(lowerQuery)
      );
    });
  }, [unusedArticles, searchQuery]);

  const handleSelectArticle = async (article: RawRssItem) => {
    setIsGenerating(true);
    try {
      const newStory = await generateStoryFromSelectedArticle(
        article,
        targetSlotName,
      );
      onStoryGenerated(newStory);
    } catch (error) {
      console.error(error);
      alert("Failed to generate story. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden bg-background border border-border shadow-2xl">
        {/* Header & Search */}
        <div className="border-b border-border bg-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Select Replacement Article
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Targeting:{" "}
                <span className="font-semibold text-primary">
                  {targetSlotName}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefreshFromIngest}
                disabled={isFetchingLive || isGenerating}
                className="flex items-center gap-2 border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
              >
                {isFetchingLive ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Globe className="h-4 w-4 text-primary" />
                )}
                {isFetchingLive ? "Loading…" : "Refresh from ingest"}
              </button>

              <button
                onClick={onClose}
                className="border border-border bg-secondary/50 p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by keyword or source name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-input bg-input py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Body: Article List */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {isGenerating ? (
            <div className="flex h-full flex-col items-center justify-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-foreground font-medium text-lg animate-pulse">
                Writing new story for {targetSlotName}...
              </p>
            </div>
          ) : isFetchingLive ? (
            <div className="flex h-full flex-col items-center justify-center space-y-4">
              <RefreshCw className="h-10 w-10 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground font-medium text-lg animate-pulse">
                Scanning RSS feeds for breaking news...
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredArticles.length === 0 ? (
                <div className="text-center text-muted-foreground mt-20 flex flex-col items-center">
                  <Search className="h-12 w-12 mb-4 opacity-20" />
                  <p className="mb-4">No articles found in your local pool.</p>
                  <button
                    onClick={handleRefreshFromIngest}
                    className="flex items-center gap-2 border border-primary bg-primary px-6 py-3 font-bold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
                  >
                    <Globe className="h-5 w-5" /> Refresh from ingest
                  </button>
                </div>
              ) : (
                filteredArticles.map((article, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectArticle(article)}
                    className="group flex cursor-pointer gap-4 border border-border bg-card p-4 transition-all hover:border-primary/50 hover:bg-accent"
                  >
                    {article.imageUrl ? (
                      <img
                        src={article.imageUrl}
                        alt="Thumbnail"
                        className="h-24 w-32 border border-border object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex h-24 w-32 items-center justify-center border border-border bg-muted">
                        <span className="text-xs text-muted-foreground font-bold uppercase">
                          No Image
                        </span>
                      </div>
                    )}
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                          {article.sourceName}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {new Date(article.pubDate).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <h3 className="text-base font-bold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
                        {article.contentSnippet || "No snippet available."}
                      </p>
                    </div>
                    <div className="flex items-center justify-center pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="border border-primary/20 bg-primary/10 p-2 text-primary">
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
