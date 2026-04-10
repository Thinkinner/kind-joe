"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PenTool, History, Settings, Zap, Loader2, Database } from "lucide-react";
import { toast } from "sonner";
import PersonalizationPanel from "@/components/(newsletter-automations)/personalization-panel";
import HistoryView from "@/components/(newsletter-automations)/history-view";
import SettingsView from "@/components/(newsletter-automations)/settings-view";
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

type AppView = "generator" | "history" | "settings";

export function NewsletterAutomationClient() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<AppView>("generator");
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
    { id: "generator" as const, label: "Generator", icon: PenTool },
    { id: "history" as const, label: "History", icon: History },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-neutral-50 font-sans text-foreground">
      <nav
        className="sticky top-0 z-20 flex shrink-0 flex-wrap items-stretch gap-0 border-b border-neutral-200 bg-white px-4 sm:px-6 lg:px-8"
        aria-label="Newsletter views"
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCurrentView(item.id)}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-semibold transition-colors sm:px-4",
              currentView === item.id
                ? "border-orange-500 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden />
            {item.label}
          </button>
        ))}
      </nav>

      <main className="min-h-0 w-full flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
        {currentView === "generator" && (
          <div className="mx-auto max-w-3xl animate-in fade-in slide-in-from-bottom-4">
            <div className="mb-6 border-l-[3px] border-orange-500 pl-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Generator
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
                New edition
              </h2>
              <p className="mt-1.5 text-sm text-neutral-600">
                Prefers <strong className="font-medium text-neutral-800">news_rss_articles</strong>{" "}
                from the last {NEWSLETTER_INGEST_FRESH_HOURS} hours. If none qualify, generation uses the{" "}
                <strong className="font-medium text-neutral-800">default RSS list</strong> (same as before).
              </p>
            </div>

            {!ingestReady ? (
              <p className="flex items-center gap-2 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking ingest pool…
              </p>
            ) : (
              <div className="mb-8 flex gap-3 border border-neutral-200 bg-white py-3 pl-3 pr-4 text-sm text-neutral-700">
                <Database
                  className="mt-0.5 h-5 w-5 shrink-0 text-orange-600"
                  aria-hidden
                />
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
                </div>
              </div>
            )}

            <PersonalizationPanel
              config={personalization}
              setConfig={setPersonalization}
            />
            <div className="flex justify-center border-t border-neutral-200 bg-white/60 py-8">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={
                  genStatus !== GenerationStatus.IDLE || !ingestReady
                }
                className="flex items-center gap-3 border border-orange-700 bg-orange-600 px-10 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-orange-700 disabled:opacity-50"
              >
                {genStatus === GenerationStatus.IDLE ? (
                  <Zap className="h-5 w-5" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin" />
                )}
                {genStatus === GenerationStatus.IDLE
                  ? "Start generation"
                  : "Processing…"}
              </button>
            </div>
          </div>
        )}
        {currentView === "history" && <HistoryView />}
        {currentView === "settings" && <SettingsView />}
      </main>
    </div>
  );
}
