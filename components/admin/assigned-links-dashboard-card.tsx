"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, ListTodo, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AssignmentItem = {
  id: number;
  url: string;
  status: "assigned" | "done" | "skipped";
  assignedAt: string;
};

type AssignedLinksDashboardCardProps = {
  variant?: "default" | "large";
};

export function AssignedLinksDashboardCard({
  variant = "default",
}: AssignedLinksDashboardCardProps) {
  const isLarge = variant === "large";
  const [openCount, setOpenCount] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/assigned-links?status=assigned&mine=1");
      if (!res.ok) return;
      const data = (await res.json()) as {
        openCount?: number;
        doneCount?: number;
        items?: AssignmentItem[];
      };
      setOpenCount(Number(data.openCount ?? 0));
      setDoneCount(Number(data.doneCount ?? 0));
      setItems(
        (data.items ?? [])
          .filter((i) => i.status === "assigned")
          .slice(0, isLarge ? 20 : 8),
      );
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
  }, [isLarge]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (id: number, status: "done" | "skipped") => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/assigned-links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(status === "done" ? "Marked finished" : "Skipped");
      await load();
    } catch {
      toast.error("Could not update link");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-[0_10px_30px_-20px_rgb(15_23_42/0.22)]",
        isLarge ? "p-6 sm:p-8" : "p-6",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            className={cn(
              "font-bold text-foreground",
              isLarge ? "text-2xl tracking-tight" : "text-base",
            )}
          >
            Your assigned links
          </h2>
          <p
            className={cn(
              "text-muted-foreground",
              isLarge ? "mt-1.5 text-sm" : "mt-1 text-sm",
            )}
          >
            Slack links assigned to you while on Kind Joe duty.
          </p>
        </div>
        <Link
          href="/admin/assigned-links"
          className="shrink-0 text-xs font-semibold text-primary underline-offset-2 hover:underline"
        >
          View all
        </Link>
      </div>

      <div
        className={cn(
          "mt-5 grid gap-3",
          isLarge ? "sm:grid-cols-2" : "grid-cols-2",
        )}
      >
        <div
          className={cn(
            "rounded-lg border border-border bg-muted/40",
            isLarge ? "px-5 py-5" : "px-3 py-3",
          )}
        >
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ListTodo className={isLarge ? "h-4 w-4" : "h-3.5 w-3.5"} />
            Open
          </div>
          <p
            className={cn(
              "mt-1 font-bold tabular-nums text-foreground",
              isLarge ? "text-4xl" : "text-2xl",
            )}
          >
            {loading ? "—" : openCount}
          </p>
        </div>
        <div
          className={cn(
            "rounded-lg border border-border bg-muted/40",
            isLarge ? "px-5 py-5" : "px-3 py-3",
          )}
        >
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CheckCircle2 className={isLarge ? "h-4 w-4" : "h-3.5 w-3.5"} />
            Finished
          </div>
          <p
            className={cn(
              "mt-1 font-bold tabular-nums text-foreground",
              isLarge ? "text-4xl" : "text-2xl",
            )}
          >
            {loading ? "—" : doneCount}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "mt-5 divide-y divide-border rounded-lg border border-border",
          isLarge && "min-h-[20rem]",
        )}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No open links assigned to you.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
                isLarge ? "p-4 sm:p-5" : "space-y-2 p-3",
              )}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex max-w-full items-center gap-1.5 font-medium text-blue-600 hover:underline dark:text-blue-400",
                    isLarge ? "text-base" : "truncate text-sm",
                  )}
                >
                  <span className={isLarge ? "break-all" : "truncate"}>
                    {item.url}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
                {item.assignedAt ? (
                  <p className="text-xs text-muted-foreground">
                    Assigned {new Date(item.assignedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size={isLarge ? "default" : "sm"}
                  className={isLarge ? undefined : "h-7 px-2 text-xs"}
                  disabled={updatingId === item.id}
                  onClick={() => void updateStatus(item.id, "done")}
                >
                  Finish
                </Button>
                <Button
                  size={isLarge ? "default" : "sm"}
                  variant="outline"
                  className={isLarge ? undefined : "h-7 px-2 text-xs"}
                  disabled={updatingId === item.id}
                  onClick={() => void updateStatus(item.id, "skipped")}
                >
                  Skip
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
