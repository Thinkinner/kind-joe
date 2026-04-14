"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Vote } from "lucide-react";
import { toast } from "sonner";
import { PredictionMarketCard, isOpenForVoting } from "@/components/predictions/prediction-market-card";
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { PredictionPublicShell } from "@/components/predictions/prediction-public-shell";
import {
  PREDICTION_CATEGORIES,
  PREDICTION_CATEGORY_LABELS,
  type PredictionCategory,
} from "@/lib/predictions/categories";

export function PredictionFeed({
  initialMarkets,
}: {
  initialMarkets: PredictionMarketView[];
}) {
  const router = useRouter();
  const { data: sessionData } = authClient.useSession();
  const userId = sessionData?.user?.id ?? null;
  const votingEnabled = useMemo(() => Boolean(userId), [userId]);

  const [markets, setMarkets] = useState<PredictionMarketView[]>(initialMarkets);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [likeSubmitting, setLikeSubmitting] = useState<number | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composeTopic, setComposeTopic] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeCategory, setComposeCategory] = useState<PredictionCategory>("general");
  const [composeOptions, setComposeOptions] = useState<string[]>(["Yes", "No"]);
  const [composeSubmitting, setComposeSubmitting] = useState(false);
  const [editingMarket, setEditingMarket] = useState<PredictionMarketView | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deletingMarket, setDeletingMarket] = useState<PredictionMarketView | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  function resetComposer() {
    setComposeTopic("");
    setComposeBody("");
    setComposeCategory("general");
    setComposeOptions(["Yes", "No"]);
  }

  function normalizeComposeOptions(rawOptions: string[]): string[] {
    const trimmed = rawOptions.map((o) => o.trim()).filter((o) => o.length > 0);
    const deduped = [...new Map(trimmed.map((o) => [o.toLowerCase(), o])).values()];
    const defaults = ["Yes", "No"];

    // Keep user-provided options first, then fill up with defaults.
    for (const fallback of defaults) {
      if (deduped.length >= 2) break;
      if (!deduped.some((o) => o.toLowerCase() === fallback.toLowerCase())) {
        deduped.push(fallback);
      }
    }
    return deduped.slice(0, 6);
  }

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
        return;
      }
      if (body.market) {
        setMarkets((prev) =>
          prev.map((market) => (market.id === body.market!.id ? body.market! : market)),
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
      router.push("/login?next=%2Fpredictions");
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
          prev.map((market) => (market.id === body.market!.id ? body.market! : market)),
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

  async function onPostCompose() {
    if (!votingEnabled) {
      router.push("/login?next=%2Ffeed");
      return;
    }
    const topic = composeTopic.trim();
    const body = composeBody.trim();
    if (!body) return;

    setComposeSubmitting(true);
    try {
      const uniqueOptions = normalizeComposeOptions(composeOptions);
      if (uniqueOptions.length < 2) {
        toast.error("Please add at least one more option.");
        return;
      }
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topic, body, options: uniqueOptions, category: composeCategory }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        market?: PredictionMarketView | null;
        error?: string;
      };
      if (!res.ok || !data.market) {
        toast.error(data.error ?? "Could not publish prediction question.");
        if (res.status === 401) {
          router.push("/login?next=%2Fpredictions");
        }
        return;
      }
      setMarkets((prev) => [data.market!, ...prev.filter((it) => it.id !== data.market!.id)]);
      setComposerOpen(false);
      resetComposer();
      toast.success("Prediction question published.");
      router.push(`/predictions/${data.market.slug}`);
    } catch {
      toast.error("Could not publish prediction question.");
    } finally {
      setComposeSubmitting(false);
    }
  }

  const orderedMarkets = [...markets].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <PredictionPublicShell active="feed">
      <section
        className="mb-4 rounded-xl border border-[#27272a] px-6 py-10 text-center"
        style={{ backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)" }}
      >
        <h1 className="text-[30px] font-bold leading-[1.1] tracking-tight text-white sm:text-[42px]">
          Predict the News. <span className="text-[#4B6FD0]">Shape the Narrative.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[14px] text-[#a1a1aa] sm:text-[15px]">
          Vote on what happens next, track crowd confidence, and join market discussions.
        </p>
        <div className="mt-6">
          {votingEnabled ? (
            <Button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="h-11 rounded-lg bg-[#102A80] px-6 font-bold text-white hover:bg-[#1A3EA0]"
            >
              Create a prediction event
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => router.push("/login?next=%2Fpredictions")}
              className="h-11 rounded-lg bg-[#102A80] px-6 font-bold text-white hover:bg-[#1A3EA0]"
            >
              Sign in to predict
            </Button>
          )}
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[14px] font-bold uppercase tracking-[1px] text-[#a1a1aa]">
            Trending events
          </h2>
        </div>
        {orderedMarkets.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {orderedMarkets.map((market) => (
              <PredictionMarketCard
                key={market.id}
                market={market}
                canVote={isOpenForVoting(market)}
                submitting={submitting === market.id}
                onVote={onVote}
                onLike={onLike}
                likeSubmitting={likeSubmitting === market.id}
                style="threadDark"
                variant="compact"
                canManage={Boolean(userId) && market.authorId === userId}
                onEdit={onEditMarket}
                onDelete={onDeleteMarket}
                enableCardOpen
                onOpenDetail={(slug) => router.push(`/predictions/${slug}`)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-[#27272a] bg-[#121214] px-4 py-16 text-center">
            <h3 className="text-[16px] font-bold text-white">No events yet</h3>
            <p className="mt-2 text-[14px] text-[#a1a1aa]">
              Be the first to create a breaking news prediction event.
            </p>
          </div>
        )}
      </section>

      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[min(760px,calc(100%-1.5rem))] max-h-[90vh] gap-0 overflow-hidden rounded-3xl border-white/10 bg-[#0f0f10] p-0 text-white shadow-2xl sm:max-w-none"
        >
          <div className="grid grid-cols-[auto_1fr_auto] items-center border-b border-white/10 px-5 py-3 sm:px-6">
            <DialogClose asChild>
              <button
                type="button"
                className="text-sm font-medium text-white/90 transition hover:text-white"
              >
                Cancel
              </button>
            </DialogClose>
            <DialogTitle className="justify-self-center text-xl font-semibold tracking-tight">
              New prediction
            </DialogTitle>
            <Button
              type="button"
              onClick={onPostCompose}
              disabled={!composeBody.trim() || composeSubmitting}
              className="h-8 rounded-lg bg-white/15 px-4 text-sm font-semibold text-white hover:bg-white/25 disabled:opacity-40"
            >
              {composeSubmitting ? "Posting..." : "Post"}
            </Button>
          </div>

          <div className="overflow-y-auto px-5 py-5 sm:px-6">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <input
                  value={composeTopic}
                  onChange={(e) => setComposeTopic(e.target.value)}
                  placeholder="Question (optional)"
                  className="min-w-0 flex-1 border-none bg-transparent p-0 text-lg font-medium leading-tight text-white placeholder:text-white/45 outline-none sm:text-xl"
                />
              </div>
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Add context."
                rows={4}
                className="min-h-[86px] resize-none border-none bg-transparent p-0 text-sm text-white placeholder:text-white/45 shadow-none outline-none focus-visible:ring-0 sm:text-base"
              />
              <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white/60">
                    Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PREDICTION_CATEGORIES.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setComposeCategory(category)}
                        className={`rounded-full border px-3 py-1.5 text-xs ${
                          composeCategory === category
                            ? "border-white bg-white text-black"
                            : "border-white/20 text-white/80 hover:bg-white/[0.08]"
                        }`}
                      >
                        {PREDICTION_CATEGORY_LABELS[category]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 text-sm font-medium text-white/80">
                  <Vote size={14} />
                  Options
                </div>
                {composeOptions.map((option, idx) => (
                  <div key={idx} className="space-y-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-white/50">
                      Choice {idx + 1}
                    </label>
                    <Input
                      value={option}
                      onChange={(e) =>
                        setComposeOptions((prev) =>
                          prev.map((p, i) => (i === idx ? e.target.value : p)),
                        )
                      }
                      placeholder={idx === 0 ? "Yes (editable)" : idx === 1 ? "No (editable)" : `Option ${idx + 1}`}
                      className="h-10 rounded-lg border-white/15 bg-white/[0.03] text-sm text-white placeholder:text-white/45"
                    />
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-9 rounded-md px-3 text-white/85 hover:bg-white/[0.08] hover:text-white"
                    disabled={composeOptions.length >= 6}
                    onClick={() =>
                      setComposeOptions((prev) => [...prev, `Option ${prev.length + 1}`])
                    }
                  >
                    Add choice
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-9 rounded-md px-3 text-white/70 hover:bg-white/[0.08] hover:text-white"
                    disabled={composeOptions.length <= 2}
                    onClick={() => setComposeOptions((prev) => prev.slice(0, -1))}
                  >
                    Remove choice
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
    </PredictionPublicShell>
  );
}

