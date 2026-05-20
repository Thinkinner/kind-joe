"use client";

import { useState } from "react";
import { Loader2, Play, RefreshCw } from "lucide-react";

type RunResult = {
  startedAt: string;
  finishedAt: string;
  ingestedScanned: number;
  queued: number;
  writerProcessed: number;
  skipped: number;
  failed: number;
  queueStats?: {
    queued: number;
    processing: number;
    failed: number;
    done: number;
    skipped: number;
  };
};

export function RssAutoWriterCard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [lastRun, setLastRun] = useState<RunResult | null>(null);

  const runNow = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/rss-auto-writer/run", {
        method: "POST",
      });
      const payload = (await res.json().catch(() => ({}))) as
        | ({ success: true } & RunResult)
        | { success?: false; error?: string };
      if (!res.ok || payload.success !== true) {
        throw new Error(payload.error || "Could not run RSS auto-writer.");
      }
      setLastRun({
        startedAt: payload.startedAt,
        finishedAt: payload.finishedAt,
        ingestedScanned: payload.ingestedScanned,
        queued: payload.queued,
        writerProcessed: payload.writerProcessed,
        skipped: payload.skipped,
        failed: payload.failed,
        queueStats: payload.queueStats,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[0_10px_30px_-20px_rgb(15_23_42/0.22)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground">RSS Auto Writer</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manual trigger for the autonomous draft pipeline.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runNow()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          Run now
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        Railway should run this every hour via cron endpoint.
      </div>

      {error ? (
        <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      {lastRun ? (
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
          <Stat label="Scanned" value={lastRun.ingestedScanned} />
          <Stat label="Queued" value={lastRun.queued} />
          <Stat label="Writer Done" value={lastRun.writerProcessed} />
          <Stat label="Skipped" value={lastRun.skipped} />
          <Stat label="Failed" value={lastRun.failed} />
          <div className="col-span-2 mt-1 flex items-center gap-1 text-[11px] text-muted-foreground sm:col-span-5">
            <RefreshCw className="h-3 w-3" />
            Last run: {new Date(lastRun.finishedAt).toLocaleString()}
          </div>
          {lastRun.queueStats ? (
            <div className="col-span-2 rounded-md border border-border bg-muted/20 px-2.5 py-2 text-[11px] text-muted-foreground sm:col-span-5">
              Queue totals — queued: {lastRun.queueStats.queued}, processing:{" "}
              {lastRun.queueStats.processing}, failed: {lastRun.queueStats.failed},
              done: {lastRun.queueStats.done}, skipped:{" "}
              {lastRun.queueStats.skipped}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-bold text-foreground">{value.toLocaleString()}</p>
    </div>
  );
}
