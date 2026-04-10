"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Row = {
  id: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  publishAt: string | null;
  updatedAt: string;
  isDraft: boolean;
};

const PAGE_SIZE = 25;

export default function AdminArticlesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [qInput, setQInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(qInput.trim()), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  const fetchPage = useCallback(
    async (opts: { offset: number; append: boolean }) => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(opts.offset),
      });
      if (debouncedQ) params.set("q", debouncedQ);

      const res = await fetch(`/api/admin/articles?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const next: Row[] = data.articles ?? [];
      setTotal(typeof data.total === "number" ? data.total : next.length);
      if (opts.append) {
        setRows((prev) => [...prev, ...next]);
      } else {
        setRows(next);
      }
    },
    [debouncedQ],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await fetchPage({ offset: 0, append: false });
      } catch {
        if (!cancelled) toast.error("Could not load articles");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const hasMore = rows.length < total;

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      await fetchPage({ offset: rows.length, append: true });
    } catch {
      toast.error("Could not load more");
    } finally {
      setLoadingMore(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Soft-delete this article?")) return;
    try {
      const res = await fetch(`/api/admin/articles/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setRows((prev) => prev.filter((r) => r.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      toast.success("Article removed");
    } catch {
      toast.error("Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-[28rem] max-w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
        <Skeleton className="h-4 w-36" />
        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="hidden grid-cols-[minmax(0,1fr)_170px_140px] items-center gap-4 border-b border-neutral-200 bg-neutral-50 px-4 py-3 md:grid">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_170px_140px] md:items-center md:gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-[85%]" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-5 w-32" />
                <div className="flex justify-start gap-2 md:justify-end">
                  <Skeleton className="h-9 w-16" />
                  <Skeleton className="h-9 w-9" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Articles
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Create, edit, and publish stories. Loads {PAGE_SIZE} at a time;
            search runs on the server.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search title or excerpt…"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            className="w-full min-w-[12rem] sm:w-64"
          />
          <Button asChild>
            <Link href="/admin/articles/new">
              <Plus className="mr-1 h-4 w-4" />
              New article
            </Link>
          </Button>
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        Showing {rows.length} of {total}
        {debouncedQ ? ` matching “${debouncedQ}”` : ""}
      </p>

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="hidden grid-cols-[minmax(0,1fr)_170px_140px] items-center gap-4 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 md:grid">
          <p>Title</p>
          <p>Status</p>
          <p className="text-right">Actions</p>
        </div>

        <ul className="divide-y divide-neutral-100">
          {rows.map((a) => (
            <li
              key={a.id}
              className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_170px_140px] md:items-center md:gap-4"
            >
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-neutral-900">
                  {a.title}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {a.category ?? "General"}
                </p>
              </div>

              <div className="text-xs text-neutral-600">
                {a.isDraft
                  ? "Draft"
                  : a.publishedAt
                    ? new Date(a.publishedAt).toLocaleString()
                    : a.publishAt
                      ? `Scheduled ${new Date(a.publishAt).toLocaleString()}`
                      : "Published"}
              </div>

              <div className="flex shrink-0 justify-start gap-2 md:justify-end">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/articles/${a.id}/edit`}>
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-700 hover:bg-red-50"
                  onClick={() => remove(a.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}

          {rows.length === 0 && (
            <li className="p-8 text-center text-sm text-neutral-500">
              No articles match.
            </li>
          )}
        </ul>
      </section>

      {hasMore && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading…
              </>
            ) : (
              `Load more (${total - rows.length} remaining)`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
