"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  Filter,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary/url";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type Row = {
  id: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  authorName: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  publishAt: string | null;
  updatedAt: string;
  isDraft: boolean;
};

const PAGE_SIZE = 25;
type StatusFilter = "all" | "published" | "draft" | "scheduled";

function getStatusMeta(a: Row): {
  label: "Published" | "Draft" | "Scheduled";
  tone: string;
  detail: string;
} {
  if (a.isDraft) {
    return {
      label: "Draft",
      tone: "border-amber-200 bg-amber-50 text-amber-700",
      detail: `Updated ${new Date(a.updatedAt).toLocaleString()}`,
    };
  }
  if (a.publishAt) {
    return {
      label: "Scheduled",
      tone: "border-sky-200 bg-sky-50 text-sky-700",
      detail: `Publishes ${new Date(a.publishAt).toLocaleString()}`,
    };
  }
  return {
    label: "Published",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    detail: a.publishedAt
      ? new Date(a.publishedAt).toLocaleString()
      : new Date(a.updatedAt).toLocaleString(),
  };
}

export default function AdminArticlesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [qInput, setQInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const hasLoadedRef = useRef(false);

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
      if (hasLoadedRef.current) {
        setSearching(true);
      } else {
        setInitialLoading(true);
      }
      try {
        await fetchPage({ offset: 0, append: false });
        if (!cancelled) {
          hasLoadedRef.current = true;
        }
      } catch {
        if (!cancelled) toast.error("Could not load articles");
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
          setSearching(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const hasMore = rows.length < total;
  const remaining = Math.max(0, total - rows.length);
  const categoryOptions = useMemo(() => {
    const unique = Array.from(
      new Set(rows.map((r) => r.category?.trim()).filter(Boolean) as string[]),
    ).sort((a, b) => a.localeCompare(b));
    return unique;
  }, [rows]);

  const visibleRows = useMemo(() => {
    return rows.filter((a) => {
      const status = getStatusMeta(a).label.toLowerCase();
      const statusMatches =
        statusFilter === "all" ? true : status === statusFilter;
      const categoryMatches =
        categoryFilter === "all" ? true : (a.category ?? "General") === categoryFilter;
      return statusMatches && categoryMatches;
    });
  }, [rows, statusFilter, categoryFilter]);

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

  if (initialLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading articles...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Articles
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Create, edit, and publish stories. Loads {PAGE_SIZE} at a time;
            search runs on the server.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative w-full min-w-[14rem] sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search title or excerpt..."
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              className="w-full rounded-xl border-slate-200/60 bg-white pl-9 shadow-sm"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="rounded-xl border border-slate-200/60 bg-white text-slate-700 hover:bg-slate-50"
              >
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              >
                <DropdownMenuRadioItem value="all">All statuses</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="published">Published</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="draft">Draft</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="scheduled">Scheduled</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Category</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={categoryFilter}
                onValueChange={setCategoryFilter}
              >
                <DropdownMenuRadioItem value="all">All categories</DropdownMenuRadioItem>
                {categoryOptions.map((cat) => (
                  <DropdownMenuRadioItem key={cat} value={cat}>
                    {cat}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            asChild
            className="rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-[0_10px_24px_-14px_rgb(225_29_72/0.8)] hover:from-rose-500 hover:to-rose-500"
          >
            <Link href="/admin/articles/new">
              <Plus className="h-4 w-4" />
              New article
            </Link>
          </Button>
        </div>
      </div>

      <section className="overflow-hidden border-t border-slate-200/60">
        <div className="hidden grid-cols-[minmax(0,1fr)_190px_90px] items-center gap-4 border-b border-slate-200/60 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
          <p>Title</p>
          <p>Status</p>
          <p className="text-right">Actions</p>
        </div>

        <ul className="divide-y divide-slate-100">
          {visibleRows.map((a) => {
            const status = getStatusMeta(a);
            return (
            <li
              key={a.id}
              className="group grid grid-cols-1 gap-3 px-6 py-4 transition-colors hover:bg-slate-50/50 md:grid-cols-[minmax(0,1fr)_190px_90px] md:items-center md:gap-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="aspect-[16/10] w-14 shrink-0 overflow-hidden rounded-md border border-slate-200/50 bg-slate-100">
                  {a.coverImageUrl ? (
                    <img
                      src={optimizeCloudinaryUrl(a.coverImageUrl, { width: 240 })}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-400">
                      No img
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-slate-900">
                    {a.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="rounded-md border-0 bg-slate-100 text-[11px] text-slate-600"
                    >
                      {a.category ?? "General"}
                    </Badge>
                    <span className="text-[11px] text-slate-500">
                      Added by {a.authorName || "Unknown"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-500">
                <Badge
                  variant="outline"
                  className={`w-fit rounded-md border ${status.tone}`}
                >
                  {status.label === "Published" && <CheckCircle2 className="h-3 w-3" />}
                  {status.label !== "Published" && <Clock3 className="h-3 w-3" />}
                  {status.label}
                </Badge>
                <p className="text-[11px] text-slate-500">{status.detail}</p>
              </div>

              <div className="flex shrink-0 justify-start md:justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-lg text-slate-500 opacity-100 transition-opacity hover:bg-slate-100 hover:text-slate-700 md:opacity-40 md:group-hover:opacity-100"
                      aria-label="Open article actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 rounded-xl">
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/articles/${a.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => remove(a.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
            );
          })}

          {visibleRows.length === 0 && (
            <li className="p-8 text-center text-sm text-neutral-500">
              No articles match.
            </li>
          )}
        </ul>

        <Separator className="bg-slate-200/60" />

        <div className="flex flex-col items-center justify-center px-6 py-10">
          {hasMore ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore || searching}
                className="my-8 w-full max-w-64 rounded-xl border-slate-200/70 bg-white text-slate-800 hover:bg-slate-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show more articles
                  </>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                {remaining.toLocaleString()} articles remaining
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">You have reached the end of the list.</p>
          )}
        </div>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Showing {visibleRows.length.toLocaleString()} of {total.toLocaleString()} articles
        {debouncedQ ? ` matching "${debouncedQ}"` : ""}
        {searching ? " · Updating..." : ""}
      </p>
    </div>
  );
}
