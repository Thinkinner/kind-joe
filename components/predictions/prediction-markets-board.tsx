"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { PredictionMarketView } from "@/lib/predictions/queries";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
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

  const userId = sessionData?.user?.id ?? null;
  const votingEnabled = useMemo(() => Boolean(userId), [userId]);

  async function onVote(marketId: number, optionId: number) {
    if (!votingEnabled) {
      router.push(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }
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

  return (
    <div className="space-y-6">
      {!votingEnabled && !isPending ? (
        <div className="rounded-xl border border-blue-500/20 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Vote with your account.{" "}
          <Link
            href={`/login?next=${encodeURIComponent(nextPath)}`}
            className="font-semibold underline underline-offset-4"
          >
            Sign in
          </Link>{" "}
          or{" "}
          <Link
            href={`/register?next=${encodeURIComponent(nextPath)}`}
            className="font-semibold underline underline-offset-4"
          >
            create an account
          </Link>
          .
        </div>
      ) : null}

      {markets.map((m) => {
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
            showDiscussLink
            enableCardOpen
            onOpenDetail={(slug) => router.push(`/predictions/${slug}`)}
          />
        );
      })}

      {markets.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No prediction markets yet.
        </div>
      ) : null}

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
    </div>
  );
}
