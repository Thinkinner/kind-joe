"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  History,
  Loader2,
  Sparkles,
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
import {
  formatGenerationErrorMessage,
  type GenerationStep,
} from "@/lib/(newsletter-automations)/generation-errors";

type AppView = "generator" | "history";

export function NewsletterAutomationClient() {
  const router = useRouter();
  const pathname = usePathname();
  const [ingestSummary, setIngestSummary] = useState<{
    count: number;
    freshHours: number;
  } | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [ingestReady, setIngestReady] = useState(false);
  const [personalization, setPersonalization] = useState<PersonalizationConfig>(
    { contentStrategy: "", writingStyle: "", exampleContent: "" },
  );
  const [genStatus, setGenStatus] = useState<GenerationStatus>(
    GenerationStatus.IDLE,
  );
  const [generationError, setGenerationError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const summary = await getNewsletterFreshIngestSummary();
        if (!cancelled) {
          setIngestSummary(summary);
          setIngestError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setIngestSummary(null);
          setIngestError(
            error instanceof Error && error.message
              ? error.message
              : "Could not load ingest count.",
          );
        }
      } finally {
        if (!cancelled) setIngestReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGenerate = async () => {
    setGenerationError(null);
    setGenStatus(GenerationStatus.FETCHING_RSS);
    const toastId = toast.loading("Loading articles…");
    let step: GenerationStep = "load_ingest";

    try {
      let rawItems = await getFreshNewsRssArticlesForNewsletter();
      if (!rawItems.length) {
        toast.loading("No recent ingest — fetching default RSS feeds…", {
          id: toastId,
        });
        step = "fetch_rss";
        rawItems = await fetchAllFeeds(DEFAULT_SOURCES);
      }
      if (!rawItems.length) {
        throw new Error(
          "No articles found. Add rows to news_rss_articles (last few hours) or check RSS feed proxies.",
        );
      }

      step = "ai_newsletter";
      setGenStatus(GenerationStatus.PROCESSING_AI);
      toast.loading("AI drafting...", { id: toastId });
      const generatedNewsletter = await generateNewsletter(
        rawItems,
        personalization,
      );

      step = "upload_images";
      setGenStatus(GenerationStatus.UPLOADING_IMAGES);
      toast.loading("Optimizing images...", { id: toastId });
      const finalNewsletter = await processNewsletterImages(generatedNewsletter);

      step = "save_draft";
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
      const message = formatGenerationErrorMessage(err, { step });
      setGenerationError(message);
      toast.error(message.split("\n")[0] ?? "Generation failed", {
        id: toastId,
        duration: 12000,
      });
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
  const ingestCount = ingestSummary?.count ?? null;
  const ingestFreshHours =
    ingestSummary?.freshHours ?? NEWSLETTER_INGEST_FRESH_HOURS;
  const hasIngestCount = typeof ingestCount === "number";
  const ingestCountIsZero = ingestCount === 0;
  const ingestHasError = Boolean(ingestError);
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
          <div className="mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-4 pb-32">
            <div className="mb-6 rounded-xl border border-slate-200/70 bg-white px-4 py-3 shadow-[0_10px_30px_-20px_rgb(15_23_42/0.2)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
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
              <div
                className={cn(
                  "mb-8 rounded-xl border p-4 text-sm shadow-[0_10px_30px_-20px_rgb(15_23_42/0.18)]",
                  ingestHasError
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : ingestCountIsZero
                      ? "border-slate-200 bg-slate-50 text-slate-800"
                    : "border-slate-200/70 bg-white text-neutral-700",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 rounded-lg p-2",
                      ingestHasError
                        ? "bg-amber-100 text-amber-700"
                        : ingestCountIsZero
                          ? "bg-slate-200/70 text-slate-600"
                        : "bg-indigo-100/80 text-indigo-600",
                    )}
                  >
                    <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold tracking-tight text-slate-900">
                      {hasIngestCount
                        ? `${ingestCount} article${ingestCount === 1 ? "" : "s"} in range`
                        : "Count unavailable"}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {ingestHasError ? (
                        <>
                          Could not read the local ingest summary right now.{" "}
                          <strong className="text-slate-800">Start generation</strong> still
                          works and will fall back to built-in RSS feeds if needed.
                        </>
                      ) : (
                        <>
                          Using rows where the article publish time (or ingest time if missing)
                          is within the last{" "}
                          <strong className="text-slate-800">{ingestFreshHours} hours</strong>.
                          If this count is 0,{" "}
                          <strong className="text-slate-800">Start generation</strong> still
                          runs and pulls the built-in RSS feeds instead.
                        </>
                      )}
                    </p>
                    {ingestHasError ? (
                      <p className="mt-1 text-[11px] text-amber-800/90">
                        Error: {ingestError}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3">
                  <Progress
                    value={
                      hasIngestCount
                        ? Math.min(100, ((ingestCount ?? 0) / 30) * 100)
                        : 0
                    }
                    className="h-1.5 bg-slate-200/70"
                  />
                </div>
              </div>
            )}

            <PersonalizationPanel
              config={personalization}
              setConfig={setPersonalization}
            />

            {generationError ? (
              <div className="mb-24 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950 shadow-sm">
                <p className="font-semibold">Newsletter generation failed</p>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-sans text-xs leading-relaxed">
                  {generationError}
                </pre>
              </div>
            ) : null}

            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/80 bg-white/90 backdrop-blur">
              <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
                <div className="text-xs text-slate-600">
                  {isGenerating
                    ? statusLabel
                    : "Ready to generate a new newsletter edition"}
                </div>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || !ingestReady}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_-18px_rgba(79,70,229,0.65)] transition hover:bg-[#4338CA] disabled:opacity-50"
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
