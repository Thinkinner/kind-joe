"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  PredictionMarketCard,
  isOpenForVoting,
} from "@/components/predictions/prediction-market-card";
import { PredictionMarketComments } from "@/components/predictions/prediction-market-comments";
import {
  PREDICTION_CATEGORIES,
  PREDICTION_CATEGORY_LABELS,
  type PredictionCategory,
} from "@/lib/predictions/categories";
import type { PredictionMarketView } from "@/lib/predictions/queries";

export function ArticlePredictionCta({
  articleSlug,
  market,
  canCreate,
}: {
  articleSlug: string;
  market: PredictionMarketView | null;
  canCreate: boolean;
}) {
  const router = useRouter();
  const [currentMarket, setCurrentMarket] = useState<PredictionMarketView | null>(market);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [topic, setTopic] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<PredictionCategory>("general");
  const [options, setOptions] = useState<string[]>(["Yes", "No"]);

  const loginPath = `/login?next=${encodeURIComponent(`/${articleSlug}`)}`;

  async function handleVote(marketId: number, optionId: number) {
    setSubmittingVote(true);
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
        setCurrentMarket(body.market);
      }
      toast.success("Vote saved.");
    } catch {
      toast.error("Could not submit vote.");
    } finally {
      setSubmittingVote(false);
    }
  }

  async function handleCreatePrediction() {
    if (!canCreate) {
      router.push(loginPath);
      return;
    }
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      toast.error("Add some context before publishing this discussion.");
      return;
    }
    const cleanedOptions = options.map((opt) => opt.trim()).filter(Boolean);
    const dedupedByLower = [...new Map(cleanedOptions.map((opt) => [opt.toLowerCase(), opt])).values()];
    if (dedupedByLower.length < 2) {
      toast.error("Please provide at least 2 unique options.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`/api/articles/${articleSlug}/predictions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          topic: topic.trim() || undefined,
          body: trimmedBody,
          category,
          options: dedupedByLower,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        market?: PredictionMarketView | null;
        error?: string;
      };
      if (!res.ok || !payload.market) {
        if (res.status === 401) {
          router.push(loginPath);
          return;
        }
        toast.error(payload.error ?? "Could not publish discussion.");
        return;
      }
      setCurrentMarket(payload.market);
      setCreateOpen(false);
      setTopic("");
      setBody("");
      setCategory("general");
      setOptions(["Yes", "No"]);
      toast.success("Discussion published.");
    } catch {
      toast.error("Could not publish discussion.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="mt-10 border-y border-neutral-200 py-6 sm:py-8">
      <div className="mb-5">
        <h3 className="text-2xl font-bold tracking-tight text-slate-900">
          What&apos;s your take on this story?
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Vote before the outcome is known and compare your call with the crowd.
        </p>
      </div>
      {currentMarket ? (
        <div className="space-y-5">
          <PredictionMarketCard
            market={currentMarket}
            canVote={isOpenForVoting(currentMarket)}
            submitting={submittingVote}
            onVote={handleVote}
            style="card"
            showDiscussLink={false}
          />
          <div className="border-t border-neutral-200 pt-5">
            <PredictionMarketComments
              slug={currentMarket.slug}
              nextPath={`/${articleSlug}`}
              theme="light"
            />
          </div>
        </div>
      ) : (
        <div className="border-l-2 border-neutral-300 pl-4 sm:pl-5">
          <p className="text-sm text-slate-700">
            No community take has been linked to this story yet.
          </p>
          {canCreate ? (
            <Button
              className="mt-4 rounded-md"
              onClick={() => setCreateOpen(true)}
            >
              Start the discussion
            </Button>
          ) : (
            <Button
              className="mt-4 rounded-md"
              onClick={() => router.push(loginPath)}
            >
              Sign in to join discussion
            </Button>
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[min(780px,calc(100%-1rem))] max-h-[90vh] overflow-y-auto border-0 bg-white p-0 shadow-none sm:max-w-none">
          <div className="space-y-5 p-5 sm:p-6">
            <DialogTitle className="border-b border-neutral-200 pb-3 text-2xl font-bold tracking-tight text-slate-900">
              Start the discussion
            </DialogTitle>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-slate-500">Question</p>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Optional headline for this discussion"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-slate-500">Context</p>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Add context and what should determine the outcome."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Category</p>
              <div className="flex flex-wrap gap-2">
                {PREDICTION_CATEGORIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs ${
                      category === item
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                    onClick={() => setCategory(item)}
                  >
                    {PREDICTION_CATEGORY_LABELS[item]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Options</p>
              {options.map((option, idx) => (
                <Input
                  key={idx}
                  value={option}
                  onChange={(e) =>
                    setOptions((prev) => prev.map((value, i) => (i === idx ? e.target.value : value)))
                  }
                  placeholder={`Option ${idx + 1}`}
                />
              ))}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOptions((prev) => [...prev, `Option ${prev.length + 1}`])}
                  disabled={options.length >= 6}
                >
                  Add option
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOptions((prev) => prev.slice(0, -1))}
                  disabled={options.length <= 2}
                >
                  Remove option
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePrediction} disabled={creating}>
                {creating ? "Publishing..." : "Publish discussion"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
