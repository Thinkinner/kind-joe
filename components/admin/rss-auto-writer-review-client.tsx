"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, Trash2 } from "lucide-react";

type QueueItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  sourceUrl: string | null;
  sourceName: string | null;
};

type QueueStats = {
  queued: number;
  processing: number;
  failed: number;
  done: number;
  skipped: number;
};

export function RssAutoWriterReviewClient() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    queued: 0,
    processing: 0,
    failed: 0,
    done: 0,
    skipped: 0,
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/rss-auto-writer/review?limit=40", {
        cache: "no-store",
      });
      const payload = (await res.json().catch(() => ({}))) as {
        items?: QueueItem[];
        queueStats?: QueueStats;
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error || "Could not load review queue.");
      setItems(Array.isArray(payload.items) ? payload.items : []);
      setQueueStats(
        payload.queueStats ?? {
          queued: 0,
          processing: 0,
          failed: 0,
          done: 0,
          skipped: 0,
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load review queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const runAction = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/admin/rss-auto-writer/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: id, action }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error || `Could not ${action} draft.`);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not ${action} draft.`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            RSS Draft Approval Queue
          </h1>
          <p className="text-sm text-muted-foreground">
            Approving publishes the story and assigns you as the author.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="Queued" value={queueStats.queued} />
        <Stat label="Processing" value={queueStats.processing} />
        <Stat label="Failed" value={queueStats.failed} />
        <Stat label="Done" value={queueStats.done} />
        <Stat label="Skipped" value={queueStats.skipped} />
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">
          Loading queue...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">
          No pending RSS auto-writer drafts.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const busy = busyId === item.id;
            return (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-card p-4 shadow-[0_10px_30px_-20px_rgb(15_23_42/0.22)]"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Source: {item.sourceName || "Unknown"}{" "}
                      {item.sourceUrl ? (
                        <>
                          •{" "}
                          <a
                            className="underline underline-offset-2"
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open source
                          </a>
                        </>
                      ) : null}
                    </p>
                    <h2 className="line-clamp-2 text-base font-semibold text-foreground">
                      {item.title}
                    </h2>
                    {item.excerpt ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {item.excerpt}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      Updated {new Date(item.updatedAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                      href={`/admin/articles/${item.id}/edit`}
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      Open Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => void runAction(item.id, "approve")}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void runAction(item.id, "reject")}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
