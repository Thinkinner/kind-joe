"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { NewsletterDraft } from "@/lib/(newsletter-automations)/types";
import { deriveNewsletterLeadFromStories } from "@/lib/(newsletter-automations)/newsletter-lead";
import {
  getDrafts,
  deleteDraft,
} from "@/lib/(newsletter-automations)/storage-services";
import { cn } from "@/lib/utils";

const HistoryView: React.FC = () => {
  const [drafts, setDrafts] = useState<NewsletterDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

      <div className="grid gap-4">
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="group relative border border-neutral-200 bg-white transition-colors hover:border-orange-300 hover:bg-neutral-50/80"
          >
            <Link
              href={`/admin/newsletter/history/${draft.id}`}
              className="block p-5 pr-14"
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
                  <span className="text-xs font-medium text-muted-foreground/60">
                    {draft.createdAt
                      ? new Date(draft.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Unknown date"}
                  </span>
                </div>

                <h3 className="mb-1 truncate text-xl font-bold text-foreground transition-colors group-hover:text-primary">
                  {draft.data?.title || "Untitled newsletter"}
                </h3>
                <p className="line-clamp-1 max-w-2xl text-sm text-muted-foreground">
                  {(draft.data?.intro || "").trim() ||
                    deriveNewsletterLeadFromStories(draft.data?.stories || []) ||
                    "No preview content available..."}
                </p>
              </div>
            </Link>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => handleDelete(e, draft.id)}
              className="absolute top-1/2 right-3 z-10 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity duration-200 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
              aria-label="Delete draft"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryView;
