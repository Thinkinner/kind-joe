"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Play, RefreshCw, RotateCcw, Trash2 } from "lucide-react";

type QueueStats = {
  queued: number;
  processing: number;
  failed: number;
  done: number;
  skipped: number;
};

type QueueItem = {
  id: string;
  status: string;
  sourceUrl: string;
  sourceName: string | null;
  attemptCount: number;
  lastError: string | null;
  lockedAt: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  articleId: string | null;
  rssTitle: string | null;
  articleTitle: string | null;
};

const REFRESH_MS = 30_000;

export function RssAutoWriterLiveClient() {
  const [loading, setLoading] = useState(true);
  const [runningAction, setRunningAction] = useState<string>("");
  const [error, setError] = useState("");
  const [queueStats, setQueueStats] = useState<QueueStats>({
    queued: 0,
    processing: 0,
    failed: 0,
    done: 0,
    skipped: 0,
  });
  const [items, setItems] = useState<QueueItem[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>("");
  const [lastRunSummary, setLastRunSummary] = useState<{
    ingestedScanned: number;
    queued: number;
    writerProcessed: number;
    skipped: number;
    staleArchived: number;
    failed: number;
  } | null>(null);

  const load = async (background = false) => {
    if (!background) setLoading(true);
    try {
      const res = await fetch("/api/admin/rss-auto-writer/status", {
        cache: "no-store",
      });
      const payload = (await res.json().catch(() => ({}))) as {
        queueStats?: QueueStats;
        items?: QueueItem[];
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error || "Could not load worker status.");
      setQueueStats(
        payload.queueStats ?? {
          queued: 0,
          processing: 0,
          failed: 0,
          done: 0,
          skipped: 0,
        },
      );
      setItems(Array.isArray(payload.items) ? payload.items : []);
      setLastUpdatedAt(new Date().toISOString());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load worker status.");
    } finally {
      if (!background) setLoading(false);
    }
  };

  useEffect(() => {
    void load();

    const tick = () => {
      if (document.visibilityState === "hidden") return;
      void load(true);
    };

    const timer = setInterval(tick, REFRESH_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void load(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const runFlow = async (mode: "ingest" | "writer" | "full", writerMax?: number) => {
    setRunningAction(mode);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("mode", mode);
      if (mode === "writer") params.set("ingestLimit", "1");
      if (typeof writerMax === "number") params.set("writerMax", String(writerMax));
      const res = await fetch(`/api/admin/rss-auto-writer/run?${params.toString()}`, {
        method: "POST",
      });
      const payload = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        ingestedScanned?: number;
        queued?: number;
        writerProcessed?: number;
        skipped?: number;
        staleArchived?: number;
        failed?: number;
      };
      if (!res.ok || payload.success !== true) {
        throw new Error(payload.error || "Could not run auto-writer.");
      }
      setLastRunSummary({
        ingestedScanned: payload.ingestedScanned ?? 0,
        queued: payload.queued ?? 0,
        writerProcessed: payload.writerProcessed ?? 0,
        skipped: payload.skipped ?? 0,
        staleArchived: payload.staleArchived ?? 0,
        failed: payload.failed ?? 0,
      });
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not run auto-writer.");
    } finally {
      setRunningAction("");
    }
  };

  const runTool = async (
    action: "retry_failed" | "release_processing" | "clear_completed",
    confirmMessage?: string,
  ) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setRunningAction(action);
    setError("");
    try {
      const res = await fetch("/api/admin/rss-auto-writer/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          hours: action === "clear_completed" ? 24 : undefined,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || payload.success !== true) {
        throw new Error(payload.error || "Queue tool failed.");
      }
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Queue tool failed.");
    } finally {
      setRunningAction("");
    }
  };

  const statusTone = useMemo(
    () => ({
      queued: "text-sky-700 bg-sky-50 border-sky-200",
      processing: "text-amber-700 bg-amber-50 border-amber-200",
      failed: "text-rose-700 bg-rose-50 border-rose-200",
      done: "text-emerald-700 bg-emerald-50 border-emerald-200",
      skipped: "text-zinc-700 bg-zinc-50 border-zinc-200",
    }),
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            RSS Auto-Writer Live Monitor
          </h1>
          <p className="text-sm text-muted-foreground">
            Auto-refreshes every 5 seconds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void runFlow("ingest")}
            disabled={Boolean(runningAction)}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {runningAction === "ingest" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Queue Latest
          </button>
          <button
            type="button"
            onClick={() => void runFlow("writer", 5)}
            disabled={Boolean(runningAction)}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {runningAction === "writer" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Process 5 Queued
          </button>
          <button
            type="button"
            onClick={() => void runFlow("full")}
            disabled={Boolean(runningAction)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {runningAction === "full" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run Full
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || Boolean(runningAction)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {lastRunSummary ? (
        <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          Last run: scanned {lastRunSummary.ingestedScanned}, queued {lastRunSummary.queued},
          wrote {lastRunSummary.writerProcessed}, skipped {lastRunSummary.skipped}, stale
          archived {lastRunSummary.staleArchived}, failed {lastRunSummary.failed}.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <Stat
          label="Backlog"
          value={queueStats.queued + queueStats.processing + queueStats.failed}
        />
        <Stat label="Queued" value={queueStats.queued} />
        <Stat label="Processing" value={queueStats.processing} />
        <Stat label="Failed" value={queueStats.failed} />
        <Stat label="Done" value={queueStats.done} />
        <Stat label="Skipped" value={queueStats.skipped} />
      </div>

      <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        Last updated:{" "}
        {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString() : "—"}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <button
          type="button"
          onClick={() => void runTool("retry_failed")}
          disabled={Boolean(runningAction)}
          className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {runningAction === "retry_failed" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          Retry Failed
        </button>
        <button
          type="button"
          onClick={() => void runTool("release_processing")}
          disabled={Boolean(runningAction)}
          className="inline-flex items-center gap-2 rounded-md border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {runningAction === "release_processing" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          Release Stuck Jobs
        </button>
        <button
          type="button"
          onClick={() =>
            void runTool(
              "clear_completed",
              "Delete completed queue rows older than 24h?",
            )
          }
          disabled={Boolean(runningAction)}
          className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {runningAction === "clear_completed" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          Cleanup Old Completed
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
          Queue Items (latest 80)
        </div>
        <div className="max-h-[560px] overflow-auto">
          {loading ? (
            <div className="px-4 py-10 text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-sm text-muted-foreground">
              No queue items yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className="space-y-2 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                        statusTone[
                          (item.status as keyof typeof statusTone) || "skipped"
                        ] || statusTone.skipped
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      attempts: {item.attemptCount}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      updated: {new Date(item.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm font-medium text-foreground">
                    {item.rssTitle || item.articleTitle || item.sourceUrl}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.sourceName || "Unknown source"} • {item.sourceUrl}
                  </p>
                  {item.lastError ? (
                    <p className="line-clamp-2 text-xs text-rose-600">
                      {item.lastError}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
