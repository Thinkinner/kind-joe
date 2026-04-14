"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { PredictionMarketView } from "@/lib/predictions/queries";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  isOpenForVoting,
  PredictionMarketCard,
} from "@/components/predictions/prediction-market-card";

export function PredictionMarketsBoard({
  initialMarkets,
  nextPath,
}: {
  initialMarkets: PredictionMarketView[];
  nextPath: string;
}) {
  const router = useRouter();
  const { data: sessionData, isPending } = authClient.useSession();
  const [markets, setMarkets] = useState<PredictionMarketView[]>(initialMarkets);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [likeSubmitting, setLikeSubmitting] = useState<number | null>(null);
  const [editingMarket, setEditingMarket] = useState<PredictionMarketView | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deletingMarket, setDeletingMarket] = useState<PredictionMarketView | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const userId = sessionData?.user?.id ?? null;
  const votingEnabled = useMemo(() => Boolean(userId), [userId]);
  const orderedMarkets = [...markets].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function onVote(marketId: number, optionId: number) {
    setSubmitting(marketId);
    try {
      const res = await fetch("/api/predictions/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ marketId, optionId }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        market?: PredictionMarketView | null;
        error?: string;
      };
      if (!res.ok) {
        toast.error(body.error ?? "Could not submit vote.");
        if (res.status === 401) {
          router.push(`/login?next=${encodeURIComponent(nextPath)}`);
        }
        return;
      }
      if (body.market) {
        setMarkets((prev) =>
          prev.map((m) => (m.id === body.market!.id ? body.market! : m)),
        );
      }
      toast.success("Vote saved.");
    } catch {
      toast.error("Could not submit vote.");
    } finally {
      setSubmitting(null);
    }
  }

  async function onLike(marketId: number) {
    if (!votingEnabled) {
      router.push(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }
    setLikeSubmitting(marketId);
    try {
      const res = await fetch("/api/predictions/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ marketId }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        market?: PredictionMarketView | null;
        error?: string;
      };
      if (!res.ok) {
        toast.error(body.error ?? "Could not update reaction.");
        return;
      }
      if (body.market) {
        setMarkets((prev) =>
          prev.map((m) => (m.id === body.market!.id ? body.market! : m)),
        );
      }
    } catch {
      toast.error("Could not update reaction.");
    } finally {
      setLikeSubmitting(null);
    }
  }

  function onEditMarket(market: PredictionMarketView) {
    setEditingMarket(market);
    setEditTitle(market.title);
    setEditDescription(market.description ?? "");
  }

  async function submitEditMarket() {
    if (!editingMarket) return;
    const nextTitle = editTitle.trim();
    if (!nextTitle) {
      toast.error("Question headline is required.");
      return;
    }
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/predictions/${editingMarket.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: nextTitle,
          description: editDescription.trim() || null,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        market?: PredictionMarketView;
        error?: string;
      };
      if (!res.ok || !body.market) {
        toast.error(body.error ?? "Could not update poll.");
        return;
      }
      setMarkets((prev) => prev.map((m) => (m.id === body.market!.id ? body.market! : m)));
      setEditingMarket(null);
      toast.success("Poll updated.");
    } catch {
      toast.error("Could not update poll.");
    } finally {
      setEditSubmitting(false);
    }
  }

  function onDeleteMarket(market: PredictionMarketView) {
    setDeletingMarket(market);
  }

  async function confirmDeleteMarket() {
    if (!deletingMarket) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/predictions/${deletingMarket.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(body.error ?? "Could not delete poll.");
        return;
      }
      setMarkets((prev) => prev.filter((m) => m.id !== deletingMarket.id));
      setDeletingMarket(null);
      toast.success("Poll deleted.");
    } catch {
      toast.error("Could not delete poll.");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {!votingEnabled && !isPending ? (
        <div className="rounded-xl border border-[#27272a] bg-[#121214] px-4 py-3 text-sm text-[#a1a1aa]">
          Vote with your account.{" "}
          <Link
            href={`/login?next=${encodeURIComponent(nextPath)}`}
            className="font-semibold text-white underline underline-offset-4"
          >
            Sign in
          </Link>{" "}
          or{" "}
          <Link
            href={`/register?next=${encodeURIComponent(nextPath)}`}
            className="font-semibold text-white underline underline-offset-4"
          >
            create an account
          </Link>
          .
        </div>
      ) : null}

      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[14px] font-bold uppercase tracking-[1px] text-[#a1a1aa]">
            Trending events
          </h2>
        </div>

        {orderedMarkets.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {orderedMarkets.map((m) => {
              const canVote = isOpenForVoting(m);
              return (
                <PredictionMarketCard
                  key={m.id}
                  market={m}
                  canVote={canVote}
                  submitting={submitting === m.id}
                  onVote={onVote}
                  onLike={onLike}
                  likeSubmitting={likeSubmitting === m.id}
                  style="threadDark"
                  variant="compact"
                  canManage={Boolean(userId) && m.authorId === userId}
                  onEdit={onEditMarket}
                  onDelete={onDeleteMarket}
                  enableCardOpen
                  onOpenDetail={(slug) => router.push(`/predictions/${slug}`)}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-[#27272a] bg-[#121214] p-6 text-sm text-[#a1a1aa]">
            No prediction questions yet.
          </div>
        )}
      </section>

      {!votingEnabled && !isPending ? (
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/login?next=${encodeURIComponent(nextPath)}`)}
          >
            Sign in to vote
          </Button>
        </div>
      ) : null}

      <Dialog
        open={Boolean(editingMarket)}
        onOpenChange={(open) => {
          if (!open) setEditingMarket(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="w-[min(620px,calc(100%-1.5rem))] gap-0 overflow-hidden rounded-2xl border border-[#27272a] bg-[#121214] p-0 text-white"
        >
          <div className="border-b border-[#27272a] px-5 py-4">
            <DialogTitle className="text-[18px] font-bold">Edit prediction</DialogTitle>
          </div>
          <div className="space-y-3 px-5 py-4">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Question headline"
              className="border-[#27272a] bg-[#1c1c1f] text-white placeholder:text-[#a1a1aa]"
            />
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Context and resolution criteria"
              rows={5}
              className="border-[#27272a] bg-[#1c1c1f] text-white placeholder:text-[#a1a1aa]"
            />
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-[#27272a] px-5 py-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="border-[#27272a] bg-transparent text-white hover:bg-[#1c1c1f] hover:text-white">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={() => void submitEditMarket()}
              disabled={editSubmitting}
              className="bg-[#102A80] font-bold text-white hover:bg-[#1A3EA0]"
            >
              {editSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deletingMarket)}
        onOpenChange={(open) => {
          if (!open) setDeletingMarket(null);
        }}
      >
        <AlertDialogContent className="border-[#27272a] bg-[#121214] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this poll?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#a1a1aa]">
              This action cannot be undone. The question and its votes will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#27272a] bg-transparent text-white hover:bg-[#1c1c1f] hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDeleteMarket()}
              disabled={deleteSubmitting}
              className="bg-[#ef4444] text-white hover:bg-[#ef4444]/90"
            >
              {deleteSubmitting ? "Deleting..." : "Delete poll"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
