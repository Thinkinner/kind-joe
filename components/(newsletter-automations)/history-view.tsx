"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Copy,
  Eye,
  Loader2,
  MoreHorizontal,
  Search,
  Trash2,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { NewsletterDraft } from "@/lib/(newsletter-automations)/types";
import { deriveNewsletterLeadFromStories } from "@/lib/(newsletter-automations)/newsletter-lead";
import {
  getDrafts,
  deleteDraft,
} from "@/lib/(newsletter-automations)/storage-services";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const HistoryView: React.FC = () => {
  const [drafts, setDrafts] = useState<NewsletterDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    const fetchDrafts = async () => {
      try {
        setIsLoading(true);
        const data = await getDrafts();
        setDrafts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load drafts:", error);
        setDrafts([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDrafts();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this draft?")) {
      await deleteDraft(id);
      const updatedData = await getDrafts();
      setDrafts(Array.isArray(updatedData) ? updatedData : []);
    }
  };
  const handleDeleteById = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this draft?")) {
      await deleteDraft(id);
      const updatedData = await getDrafts();
      setDrafts(Array.isArray(updatedData) ? updatedData : []);
      toast.success("Newsletter deleted");
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "approved":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground border-transparent";
    }
  };
  const getStatusRail = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-emerald-400";
      case "approved":
        return "bg-indigo-400";
      default:
        return "bg-amber-300";
    }
  };
  const humanDate = (value: number) => {
    const date = new Date(value);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const days = Math.floor(
      (startOfToday.getTime() - startOfTarget.getTime()) / (1000 * 60 * 60 * 24),
    );
    const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (days === 0) return `Today at ${time}`;
    if (days === 1) return `Yesterday at ${time}`;
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const filteredDrafts = drafts.filter((draft) => {
    const q = query.trim().toLowerCase();
    const title = (draft.data?.title ?? "").toLowerCase();
    const intro = (draft.data?.intro ?? "").toLowerCase();
    const statusMatches = statusFilter === "all" ? true : draft.status === statusFilter;
    const searchMatches = q ? title.includes(q) || intro.includes(q) : true;
    return statusMatches && searchMatches;
  });
  const visibleDrafts = filteredDrafts.slice(0, visibleCount);
  const remainingCount = Math.max(0, filteredDrafts.length - visibleCount);

  useEffect(() => {
    setVisibleCount(5);
  }, [query, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mb-2 h-8 w-8 animate-spin" />
        <p className="text-sm">Loading history...</p>
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="py-20 text-center duration-500 animate-in fade-in">
        <div className="mb-2 text-lg text-muted-foreground">
          No newsletters found.
        </div>
        <p className="text-sm text-muted-foreground/60">
          Go to the Generator tab to create your first one.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl duration-700 animate-in fade-in slide-in-from-bottom-4">
      <h2 className="mb-8 text-3xl font-bold tracking-tight text-foreground">
        Newsletter history
      </h2>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search history..."
            className="rounded-xl border-slate-200/70 bg-white pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 rounded-xl border-slate-200/70 bg-white">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {visibleDrafts.map((draft) => (
          <div
            key={draft.id}
            className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200/70 bg-white transition-all hover:border-slate-300 hover:shadow-md"
          >
            <span
              className={cn(
                "absolute inset-y-0 left-0 w-[3px]",
                getStatusRail(draft.status),
              )}
            />
            <Link
              href={`/admin/newsletter/history/${draft.id}`}
              className="block p-5 pl-6 pr-14"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      "px-2 py-0 text-[10px] font-bold tracking-widest uppercase",
                      getStatusStyles(draft.status),
                    )}
                  >
                    {draft.status}
                  </Badge>
                  <span className="text-xs font-medium text-muted-foreground/70">
                    {draft.createdAt ? humanDate(draft.createdAt) : "Unknown date"}
                  </span>
                </div>

                <h3 className="mb-1 truncate text-xl font-bold tracking-tight text-slate-900 transition-colors group-hover:text-primary">
                  {draft.data?.title || "Untitled newsletter"}
                </h3>
                <p className="line-clamp-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {(draft.data?.intro || "").trim() ||
                    deriveNewsletterLeadFromStories(draft.data?.stories || []) ||
                    "No preview content available..."}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    1.2k Recipients
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    42% Open Rate
                  </span>
                </div>
              </div>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-3 top-3 z-10 rounded-full text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() => {
                    toast.message("Duplicate action coming soon");
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    toast.message("Public view coming soon");
                  }}
                >
                  <Eye className="h-4 w-4" />
                  View Online
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleDeleteById(draft.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      {remainingCount > 0 && (
        <div className="flex flex-col items-center justify-center py-10">
          <Button
            type="button"
            variant="outline"
            className="my-2 w-full max-w-64 rounded-xl"
            onClick={() => setVisibleCount((prev) => prev + 5)}
          >
            Show more newsletters
          </Button>
          <p className="text-[11px] text-muted-foreground">
            {remainingCount.toLocaleString()} newsletters remaining
          </p>
        </div>
      )}

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Showing {visibleDrafts.length.toLocaleString()} of{" "}
        {filteredDrafts.length.toLocaleString()} newsletters
      </p>
    </div>
  );
};

export default HistoryView;
