"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AssignmentItem = {
  id: number;
  url: string;
  status: "assigned" | "done" | "skipped";
  assignedAt: string;
  completedAt: string | null;
  assigneeUserId: string;
  assigneeName: string | null;
  assigneeAlias: string | null;
};

type Filter = "assigned" | "done" | "skipped" | "all";

export function AssignedLinksClient() {
  const [filter, setFilter] = useState<Filter>("assigned");
  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [viewerCanSeeAll, setViewerCanSeeAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = useCallback(async (status: Filter) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/assigned-links?status=${status}`);
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as {
        items: AssignmentItem[];
        openCount: number;
        doneCount?: number;
        viewerCanSeeAll: boolean;
      };
      setItems(data.items);
      setOpenCount(data.openCount);
      setDoneCount(Number(data.doneCount ?? 0));
      setViewerCanSeeAll(data.viewerCanSeeAll);
    } catch {
      toast.error("Could not load assigned links");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  const updateStatus = async (id: number, status: "done" | "skipped") => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/assigned-links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(status === "done" ? "Marked done" : "Skipped");
      await load(filter);
    } catch {
      toast.error("Could not update assignment");
    } finally {
      setUpdatingId(null);
    }
  };

  const filters: { id: Filter; label: string }[] = [
    { id: "assigned", label: "Open" },
    { id: "done", label: "Done" },
    { id: "skipped", label: "Skipped" },
    { id: "all", label: "All" },
  ];

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Assigned links
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Slack links auto-assigned to you. You have {openCount} open ·{" "}
          {doneCount} finished.
          {viewerCanSeeAll ? " Admins can see everyone's assignments." : null}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                filter === f.id
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          Loading…
        </section>
      ) : items.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          No links in this view.
        </section>
      ) : (
        <section className="space-y-3">
          {items.map((item) => {
            const displayName =
              (item.assigneeAlias ?? "").trim() ||
              (item.assigneeName ?? "").trim() ||
              "Staff";
            return (
              <article
                key={item.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 break-all text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {item.url}
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                    <p className="text-xs text-muted-foreground">
                      Assigned{" "}
                      {item.assignedAt
                        ? new Date(item.assignedAt).toLocaleString()
                        : "—"}
                      {viewerCanSeeAll ? ` · ${displayName}` : null}
                      {" · "}
                      <span className="capitalize">{item.status}</span>
                    </p>
                  </div>
                  {item.status === "assigned" ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={updatingId === item.id}
                        onClick={() => void updateStatus(item.id, "done")}
                      >
                        Done
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingId === item.id}
                        onClick={() => void updateStatus(item.id, "skipped")}
                      >
                        Skip
                      </Button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
