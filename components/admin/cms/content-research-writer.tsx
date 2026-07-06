"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sparkles,
  FileText,
} from "lucide-react";
import { AdminArticleForm } from "@/components/admin/cms/admin-article-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ADSENSE_MIN_WORDS,
  ADSENSE_WRITING_CHECKLIST,
} from "@/lib/ads/adsense-content-requirements";

type PrefillData = {
  title?: string;
  slug?: string;
  category?: string;
  tags?: string[];
  excerpt?: string;
  draftMarkdown?: string;
  draftHtml?: string;
  seoDescription?: string;
};

type SourceFirstSource = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  snippet: string;
  extractedText: string;
  extractedLength: number;
};

type SourceFirstPayload = {
  query: string;
  sources: SourceFirstSource[];
  skipped?: Array<{
    url: string;
    title: string;
    reason: string;
  }>;
  generationMode?: "source-first" | "editorial";
};

type WritingMode = "auto" | "source-first" | "editorial";

const WRITING_MODE_OPTIONS: Array<{
  id: WritingMode;
  label: string;
  description: string;
}> = [
  {
    id: "auto",
    label: "Auto (recommended)",
    description:
      "Find sources when possible. If none turn up, write an honest editorial explainer like a real columnist.",
  },
  {
    id: "source-first",
    label: "Source-backed news",
    description:
      "Reporting tone with verified links. Needs at least one usable source URL.",
  },
  {
    id: "editorial",
    label: "Editorial — no sources needed",
    description:
      "Analysis and context from your notes only. No fake citations — clearly labeled editorial.",
  },
];

type SourceFirstJobPayload = {
  id: string;
  topic: string;
  status: "queued" | "processing" | "done" | "failed" | string;
  result?: (PrefillData & { sourceFirst?: SourceFirstPayload }) | null;
  error?: string | null;
};

type SourceFirstWorkerStatus = {
  workerOnline: boolean;
  lastHeartbeatAt: string | null;
  queuedCount: number;
  processingCount: number;
  oldestQueuedAgeMs: number | null;
  hint: string;
};

type WorkflowStep = "input" | "processing" | "edit";

export function ContentResearchWriter() {
  const [step, setStep] = useState<WorkflowStep>("input");
  const [sourceInput, setSourceInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [research, setResearch] = useState<SourceFirstPayload | null>(null);
  const [prefill, setPrefill] = useState<PrefillData | undefined>(undefined);
  const [activeJob, setActiveJob] = useState<SourceFirstJobPayload | null>(null);
  const [writingMode, setWritingMode] = useState<WritingMode>("auto");
  const [workerStatus, setWorkerStatus] = useState<SourceFirstWorkerStatus | null>(
    null,
  );

  const applyPrefillData = useCallback((data: PrefillData) => {
    setPrefill({
      title: String(data.title ?? ""),
      slug: String(data.slug ?? ""),
      category: String(data.category ?? "General"),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      excerpt: String(data.excerpt ?? ""),
      draftMarkdown: String(data.draftMarkdown ?? ""),
      draftHtml: String(data.draftHtml ?? ""),
      seoDescription: String(data.seoDescription ?? ""),
    });
  }, []);

  useEffect(() => {
    if (!activeJob?.id || step !== "processing") return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const pollJob = async () => {
      try {
        const [jobRes, workerRes] = await Promise.all([
          fetch(`/api/admin/ai/source-first/jobs/${activeJob.id}`, {
            cache: "no-store",
          }),
          fetch("/api/admin/ai/source-first/worker-status", {
            cache: "no-store",
          }),
        ]);
        const payload = (await jobRes.json().catch(() => ({}))) as {
          job?: SourceFirstJobPayload;
          error?: string;
        };
        const workerPayload = (await workerRes.json().catch(() => ({}))) as {
          status?: SourceFirstWorkerStatus;
        };
        if (!jobRes.ok) {
          throw new Error(payload.error || "Could not load content research job");
        }
        if (cancelled || !payload.job) return;

        setActiveJob(payload.job);
        if (workerPayload.status) {
          setWorkerStatus(workerPayload.status);
        }

        if (payload.job.status === "done" && payload.job.result) {
          applyPrefillData(payload.job.result);
          setResearch(payload.job.result.sourceFirst ?? null);
          setStep("edit");
          toast.success("Draft ready. Review AdSense checks before publishing.");
          return;
        }

        if (payload.job.status === "failed") {
          setStep("input");
          toast.error(payload.job.error || "Content research job failed");
          return;
        }

        timeoutId = setTimeout(pollJob, 4000);
      } catch (error) {
        if (cancelled) return;
        toast.error(
          error instanceof Error ? error.message : "Could not poll content research job",
        );
      }
    };

    pollJob();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeJob?.id, applyPrefillData, step]);

  const startContentResearchJob = async () => {
    const topic = sourceInput.trim();
    if (!topic) return;

    setLoading(true);
    setResearch(null);
    setPrefill(undefined);
    setActiveJob(null);
    try {
      const res = await fetch("/api/admin/ai/source-first/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          adsenseReady: true,
          writingMode,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        job?: SourceFirstJobPayload;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not queue content research job");
      }
      if (!data.job) {
        throw new Error("Content research job was not created.");
      }

      setActiveJob(data.job);
      setStep("processing");
      toast.success("Job queued. The Railway worker will research and write the draft.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start content research",
      );
    } finally {
      setLoading(false);
    }
  };

  const resetWorkflow = () => {
    setStep("input");
    setSourceInput("");
    setResearch(null);
    setPrefill(undefined);
    setActiveJob(null);
  };

  if (step === "edit") {
    return (
      <div className="space-y-6">
        <Card className="border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                Draft complete
              </p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">
                Review, edit, then publish
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The quality panel below tracks AdSense readiness ({ADSENSE_MIN_WORDS}+
                words, attribution, quotes, meta). Always do a final human read before
                publish.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={resetWorkflow}>
              Start new research
            </Button>
          </div>
        </Card>

        {research ? (
          <Card className="space-y-4 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {research.sources.length > 0 ? "Sources used" : "Editorial draft"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Query: {research.query}
              </p>
              {research.generationMode === "editorial" || research.sources.length === 0 ? (
                <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
                  Written as Kind Joe editorial analysis — no verified wire sources
                  required. Review the Editorial Note section before publish.
                </p>
              ) : null}
            </div>
            {research.sources.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {research.sources.map((sourceItem) => (
                <a
                  key={sourceItem.id}
                  href={sourceItem.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <p className="text-xs font-semibold text-primary">
                    {sourceItem.id} · {sourceItem.publisher}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">
                    {sourceItem.title}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {sourceItem.snippet}
                  </p>
                </a>
              ))}
            </div>
            ) : null}
          </Card>
        ) : null}

        <AdminArticleForm initialValues={prefill} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="space-y-5 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {step === "input"
                  ? "1. Paste your topic or sources"
                  : "2. Worker is researching and writing"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {step === "input"
                  ? "Add a headline idea, bullet notes, raw text, or article links. Processing runs on Railway — no server timeout."
                  : "This page polls the job every few seconds until the draft is ready."}
              </p>
            </div>
          </div>

          <Textarea
            rows={9}
            value={sourceInput}
            onChange={(event) => setSourceInput(event.target.value)}
            disabled={step === "processing"}
            placeholder={`Example:\n\nTopic: Ventura housing vote\n\nOr paste links:\nhttps://example.com/story-one\nhttps://example.com/story-two\n\nOr paste raw notes and quotes you collected.`}
            className="min-h-[220px] resize-y"
          />

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Writing mode</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {WRITING_MODE_OPTIONS.map((option) => {
                const selected = writingMode === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={step === "processing"}
                    onClick={() => setWritingMode(option.id)}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? "border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-500 dark:bg-emerald-950/30"
                        : "border-border bg-card hover:border-muted-foreground/30"
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">{option.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {step === "input" ? (
              <>
                <Button
                  onClick={startContentResearchJob}
                  disabled={loading || !sourceInput.trim()}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {loading ? "Queueing..." : "Start content research"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setStep("edit")}>
                  Skip to manual editor
                </Button>
              </>
            ) : null}

            {step === "processing" && activeJob ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Status: {activeJob.status}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={resetWorkflow}
                >
                  Cancel
                </Button>
              </div>
            ) : null}
          </div>

          {step === "processing" && activeJob ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100">
                <p className="font-medium">Job {activeJob.id.slice(0, 8)}… is running</p>
                <p className="mt-1 text-emerald-900/80 dark:text-emerald-100/80">
                  {activeJob.status === "queued"
                    ? "Queued on Railway — worker picks up within a few seconds (no Vercel timeout)."
                    : "Research + AdSense-ready draft typically takes 1–3 minutes. Keep this tab open."}
                </p>
                {workerStatus ? (
                  <p className="mt-2 text-xs text-emerald-900/70 dark:text-emerald-100/70">
                    {workerStatus.hint}
                  </p>
                ) : null}
                {activeJob.status === "failed" && activeJob.error ? (
                  <p className="mt-2 text-destructive">{activeJob.error}</p>
                ) : null}
              </div>
              {workerStatus &&
              !workerStatus.workerOnline &&
              activeJob.status === "queued" &&
              (workerStatus.oldestQueuedAgeMs ?? 0) >= 45000 ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
                  <p className="font-medium">Railway worker not detected</p>
                  <p className="mt-1">
                    Jobs stay queued until the content-research worker service is
                    running on Railway with the same{" "}
                    <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900/40">
                      DATABASE_URL
                    </code>{" "}
                    and Google keys. See{" "}
                    <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900/40">
                      docs/railway/content-research-worker.md
                    </code>
                    .
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>

        <Card className="h-fit space-y-4 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              AdSense checklist
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Built-in quality gates target Google AdSense program basics.
            </p>
          </div>
          <ul className="space-y-3">
            {ADSENSE_WRITING_CHECKLIST.map((item) => (
              <li key={item.id} className="flex gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <Card className="flex flex-col gap-3 border-dashed p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Background worker flow</p>
            <p className="text-sm text-muted-foreground">
              Queue job → Railway worker researches sources → writes {ADSENSE_MIN_WORDS}+
              word draft → you edit in CMS. Local dev: run{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                npm run worker:source-first-article
              </code>
              .
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
