"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  History,
  Loader2,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import PersonalizationPanel from "@/components/(newsletter-automations)/personalization-panel";
import HistoryView from "@/components/(newsletter-automations)/history-view";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GenerationStatus,
  type PersonalizationConfig,
} from "@/lib/(newsletter-automations)/types";
import { generateNewsletter } from "@/lib/(newsletter-automations)/gemini-service";
import {
  saveDraft,
  getSettings,
  getNewsletterFreshIngestSummary,
  getFreshNewsRssArticlesForNewsletter,
} from "@/lib/(newsletter-automations)/storage-services";
import { processNewsletterImages } from "@/lib/(newsletter-automations)/cloudinary-service";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SOURCES,
  NEWSLETTER_INGEST_FRESH_HOURS,
} from "@/lib/(newsletter-automations)/constants";
import { fetchAllFeeds } from "@/lib/(newsletter-automations)/rss-service";

type AppView = "generator" | "history";

export function NewsletterAutomationClient() {
  const router = useRouter();
  const pathname = usePathname();
  const [ingestSummary, setIngestSummary] = useState<{
    count: number;
    freshHours: number;
  } | null>(null);
  const [ingestReady, setIngestReady] = useState(false);
  const [personalization, setPersonalization] = useState<PersonalizationConfig>(
    { contentStrategy: "", writingStyle: "", exampleContent: "" },
  );
  const [genStatus, setGenStatus] = useState<GenerationStatus>(
    GenerationStatus.IDLE,
  );
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const summary = await getNewsletterFreshIngestSummary();
        if (!cancelled) setIngestSummary(summary);
      } catch {
        if (!cancelled)
          setIngestSummary({ count: 0, freshHours: NEWSLETTER_INGEST_FRESH_HOURS });
      } finally {
        if (!cancelled) setIngestReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGenerate = async () => {
    setGenStatus(GenerationStatus.FETCHING_RSS);
    const toastId = toast.loading("Loading articles…");

    try {
      let rawItems = await getFreshNewsRssArticlesForNewsletter();
      if (!rawItems.length) {
        toast.loading("No recent ingest — fetching default RSS feeds…", {
          id: toastId,
        });
        rawItems = await fetchAllFeeds(DEFAULT_SOURCES);
      }
      if (!rawItems.length) {
        throw new Error(
          "No articles found. Add data to news_rss_articles (last few hours) or check RSS proxies for default feeds.",
        );
      }

      setGenStatus(GenerationStatus.PROCESSING_AI);
      toast.loading("AI drafting...", { id: toastId });
      const generatedNewsletter = await generateNewsletter(
        rawItems,
        personalization,
      );

      setGenStatus(GenerationStatus.UPLOADING_IMAGES);
      toast.loading("Optimizing images...", { id: toastId });
      const settings = await getSettings();
      const finalNewsletter = await processNewsletterImages(
        generatedNewsletter,
        settings,
      );

      const newDraft: NewsletterDraft = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        status: "draft",
        data: finalNewsletter,
        sourcePool: rawItems,
        articles: [],
      };

      await saveDraft(newDraft);
      toast.success("Done!", { id: toastId });
      router.push(`/admin/newsletter/history/${newDraft.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Generation failed";
      toast.error(message, { id: toastId });
    } finally {
      setGenStatus(GenerationStatus.IDLE);
    }
  };

  const navItems = [
    { id: "generator" as const, label: "Generator", icon: Sparkles },
    { id: "history" as const, label: "History", icon: History },
  ];
  const currentView: AppView = pathname.includes("/newsletter/history")
    ? "history"
    : "generator";
  const isGenerating = genStatus !== GenerationStatus.IDLE;
  const statusLabel =
    genStatus === GenerationStatus.FETCHING_RSS
      ? "Collecting sources..."
      : genStatus === GenerationStatus.PROCESSING_AI
        ? "Rendering with AI..."
        : genStatus === GenerationStatus.UPLOADING_IMAGES
          ? "Optimizing images..."
          : "Ready";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-neutral-50 font-sans text-foreground">
      <nav
        className="sticky top-0 z-20 flex shrink-0 items-center border-b border-slate-200/70 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8"
        aria-label="Newsletter views"
      >
        <Tabs value={currentView} className="w-full">
          <TabsList className="h-10 rounded-full border border-slate-200/70 bg-slate-100/70 p-1">
            {navItems.map((item) => (
              <TabsTrigger
                key={item.id}
                value={item.id}
                onClick={() =>
                  router.push(
                    item.id === "generator"
                      ? "/admin/newsletter"
                      : "/admin/newsletter/history",
                  )
                }
                className={cn(
                  "rounded-full px-4 text-sm font-medium",
                  currentView === item.id && item.id === "generator"
                    ? "text-indigo-700"
                    : "",
                )}
              >
                <item.icon
                  className={cn(
                    "h-4.5 w-4.5 shrink-0",
                    item.id === "generator"
                      ? "rounded-full bg-indigo-100 p-0.5 text-indigo-600"
                      : "text-slate-500",
                  )}
                  aria-hidden
                />
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </nav>

      <main className="min-h-0 w-full flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
        {currentView === "generator" && (
          <div className="mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-4 pb-28">
            <div className="mb-6 rounded-xl border border-slate-200/70 bg-white px-4 py-3 shadow-[0_10px_30px_-20px_rgb(15_23_42/0.2)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Generator
              </p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900">
                New edition
              </h2>
              <p className="mt-1.5 text-sm text-neutral-600">
                Prefers <strong className="font-medium text-neutral-800">news_rss_articles</strong>{" "}
                from the last {NEWSLETTER_INGEST_FRESH_HOURS} hours. If none qualify, generation uses the{" "}
                <strong className="font-medium text-neutral-800">default RSS list</strong> (same as before).
              </p>
            </div>

            {!ingestReady ? (
              <div className="mb-6 rounded-xl border border-indigo-200/60 bg-indigo-50/60 p-4">
                <div className="flex items-center gap-2 text-sm text-indigo-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking ingest pool...
                </div>
                <div className="mt-3 overflow-hidden rounded-full bg-indigo-100/80">
                  <div className="h-1.5 w-1/2 animate-pulse rounded-full bg-indigo-400" />
                </div>
              </div>
            ) : (
              <div className="mb-8 flex gap-3 rounded-xl border border-slate-200/70 bg-white py-3 pl-3 pr-4 text-sm text-neutral-700 shadow-[0_10px_30px_-20px_rgb(15_23_42/0.18)]">
                <div className="mt-0.5 rounded-full bg-indigo-100 p-1.5">
                  <Wand2 className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
                </div>
                <div>
                  <p className="font-medium text-neutral-900">
                    {ingestSummary?.count ?? 0} article
                    {(ingestSummary?.count ?? 0) === 1 ? "" : "s"} in range
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                    Using rows where the article publish time (or ingest time if missing)
                    is within the last{" "}
                    <strong className="text-neutral-800">
                      {ingestSummary?.freshHours ?? NEWSLETTER_INGEST_FRESH_HOURS} hours
                    </strong>
                    . If this count is 0, <strong className="text-neutral-800">Start generation</strong> still runs and pulls the built-in RSS feeds instead.
                  </p>
                  <div className="mt-3">
                    <Progress
                      value={Math.min(100, ((ingestSummary?.count ?? 0) / 30) * 100)}
                      className="h-1.5 bg-indigo-100"
                    />
                  </div>
                </div>
              </div>
            )}

            <PersonalizationPanel
              config={personalization}
              setConfig={setPersonalization}
            />
            <div className="fixed bottom-4 left-1/2 z-20 w-[min(720px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-slate-200/70 bg-white/95 p-3 shadow-[0_20px_45px_-24px_rgb(15_23_42/0.35)] backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  {isGenerating ? statusLabel : "Ready to generate a new newsletter edition"}
                </div>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || !ingestReady}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_-18px_rgb(225_29_72/0.8)] transition hover:from-rose-500 hover:to-orange-500 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  {isGenerating ? "Rendering..." : "Generate Newsletter"}
                </button>
              </div>
            </div>
            {isGenerating && (
              <div className="fixed bottom-24 right-6 z-20 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
                </span>
                Rendering...
              </div>
            )}
          </div>
        )}
        {currentView === "history" && <HistoryView />}
      </main>
    </div>
  );
}
