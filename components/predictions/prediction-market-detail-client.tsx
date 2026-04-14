"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Calendar, Users } from "lucide-react";
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
import { isOpenForVoting } from "@/components/predictions/prediction-market-card";
import { PredictionMarketComments } from "@/components/predictions/prediction-market-comments";
import { PredictionPublicShell } from "@/components/predictions/prediction-public-shell";

export function PredictionMarketDetailClient({
  initialMarket,
  relatedMarkets,
  slug,
  nextPath,
}: {
  initialMarket: PredictionMarketView;
  relatedMarkets: Array<{ id: number; slug: string; title: string; totalVotes: number }>;
  slug: string;
  nextPath: string;
}) {
  const router = useRouter();
  const { data: sessionData, isPending } = authClient.useSession();
  const [market, setMarket] = useState<PredictionMarketView>(initialMarket);
  const [submitting, setSubmitting] = useState(false);
  const [editingOpen, setEditingOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(initialMarket.title);
  const [editDescription, setEditDescription] = useState(initialMarket.description ?? "");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const userId = sessionData?.user?.id ?? null;
  const votingEnabled = useMemo(() => Boolean(userId), [userId]);
  const canVote = isOpenForVoting(market);
  const yesOption = market.options[0] ?? null;
  const noOption = market.options[1] ?? null;
  const yesPercentage = yesOption?.percentage ?? 50;
  const noPercentage = noOption?.percentage ?? 50;

  async function onVote(marketId: number, optionId: number) {
    setSubmitting(true);
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
        setMarket(body.market);
      }
      toast.success("Vote saved.");
    } catch {
      toast.error("Could not submit vote.");
    } finally {
      setSubmitting(false);
    }
  }

  function onEditMarket(target: PredictionMarketView) {
    setEditTitle(target.title);
    setEditDescription(target.description ?? "");
    setEditingOpen(true);
  }

  async function submitEditMarket() {
    const nextTitle = editTitle.trim();
    if (!nextTitle) {
      toast.error("Question headline is required.");
      return;
    }
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/predictions/${market.id}`, {
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
      setMarket(body.market);
      setEditingOpen(false);
      toast.success("Poll updated.");
    } catch {
      toast.error("Could not update poll.");
    } finally {
      setEditSubmitting(false);
    }
  }

  function onDeleteMarket() {
    setDeleteOpen(true);
  }

  async function confirmDeleteMarket() {
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/predictions/${market.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(body.error ?? "Could not delete poll.");
        return;
      }
      toast.success("Poll deleted.");
      router.push("/predictions");
    } catch {
      toast.error("Could not delete poll.");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  return (
    <PredictionPublicShell active="detail">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section
            className="rounded-xl border border-[#27272a] bg-[#121214] p-8"
            style={{ backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)" }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#4B6FD0]">
                {market.category} • {market.status.replace("_", " ")}
              </p>
              {Boolean(userId) && market.authorId === userId ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEditMarket(market)}
                    className="rounded-md border border-[#27272a] px-2.5 py-1 text-xs text-[#a1a1aa] hover:bg-[#1c1c1f] hover:text-white"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={onDeleteMarket}
                    className="rounded-md border border-[#27272a] px-2.5 py-1 text-xs text-red-300 hover:bg-[#1c1c1f]"
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>

            <h1 className="mb-6 text-[32px] font-bold leading-[1.1] tracking-[-0.8px] text-white sm:text-[40px]">
              {market.title}
            </h1>

            <div className="mb-6 flex flex-wrap items-center gap-4 border-b border-[#27272a] pb-6 text-[13px] text-[#a1a1aa]">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  Ends{" "}
                  {market.locksAt
                    ? new Date(market.locksAt).toLocaleString()
                    : "when market closes"}
                </span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{market.totalVotes.toLocaleString()} predictions</span>
              </div>
            </div>

            {market.description ? (
              <p className="whitespace-pre-wrap text-[16px] leading-relaxed text-[#a1a1aa]">
                {market.description}
              </p>
            ) : (
              <p className="text-[16px] leading-relaxed text-[#a1a1aa]">
                Vote on this question and follow the discussion as new information comes in.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-[#27272a] bg-[#121214] p-0">
            <div className="border-b border-[#27272a] px-6 py-4">
              <h2 className="text-[14px] font-bold uppercase tracking-[1px] text-[#a1a1aa]">
                Discussion
              </h2>
            </div>
            <PredictionMarketComments slug={slug} nextPath={nextPath} theme="dark" />
          </section>
        </div>

        <aside className="lg:col-span-1">
          <section className="sticky top-24 rounded-xl border border-[#27272a] bg-[#121214] p-6">
            <h3 className="mb-6 text-[14px] font-bold uppercase tracking-[1px] text-[#a1a1aa]">
              Prediction market
            </h3>

            <div className="mb-8">
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <div className="mb-1 text-[12px] uppercase text-[#a1a1aa]">Current Probability</div>
                  <div className="text-[48px] font-extrabold leading-none text-white">
                    {yesPercentage}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="mb-1 text-[12px] uppercase text-[#a1a1aa]">
                    {(noOption?.label ?? "No")} Probability
                  </div>
                  <div className="text-[24px] font-bold text-[#ef4444]">{noPercentage}%</div>
                </div>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-[#1c1c1f]">
                <div className="h-full bg-[#102A80]" style={{ width: `${yesPercentage}%` }} />
              </div>
            </div>

            <div className="space-y-3">
              {yesOption ? (
                <button
                  type="button"
                  onClick={() => void onVote(market.id, yesOption.id)}
                  disabled={!canVote || submitting}
                  className={`h-14 w-full rounded-lg text-[16px] font-bold transition ${
                    market.viewerVoteOptionId === yesOption.id
                      ? "border-2 border-white bg-[#102A80] text-white"
                      : "bg-[#102A80] text-white hover:bg-[#1A3EA0]"
                  } ${!canVote || submitting ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  {market.viewerVoteOptionId === yesOption.id
                    ? `Predicted ${yesOption.label}`
                    : `Predict ${yesOption.label}`}
                </button>
              ) : null}
              {noOption ? (
                <button
                  type="button"
                  onClick={() => void onVote(market.id, noOption.id)}
                  disabled={!canVote || submitting}
                  className={`h-14 w-full rounded-lg text-[16px] font-bold transition ${
                    market.viewerVoteOptionId === noOption.id
                      ? "border-2 border-white bg-[#ef4444] text-white"
                      : "bg-[#ef4444] text-white hover:opacity-90"
                  } ${!canVote || submitting ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  {market.viewerVoteOptionId === noOption.id
                    ? `Predicted ${noOption.label}`
                    : `Predict ${noOption.label}`}
                </button>
              ) : null}
            </div>

            {!votingEnabled && !isPending ? (
              <p className="mt-6 text-center text-[13px] text-[#a1a1aa]">
                <Link
                  href={`/login?next=${encodeURIComponent(nextPath)}`}
                  className="font-semibold text-white hover:underline"
                >
                  Sign in
                </Link>{" "}
                to make a prediction
              </p>
            ) : null}
          </section>
        </aside>
      </div>

      <Dialog open={editingOpen} onOpenChange={setEditingOpen}>
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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
