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
import { PredictionMarketComments } from "@/components/predictions/prediction-market-comments";
import { FeedDesktopRail } from "@/components/predictions/feed-desktop-rail";

export function PredictionMarketDetailClient({
  initialMarket,
  slug,
  nextPath,
}: {
  initialMarket: PredictionMarketView;
  slug: string;
  nextPath: string;
}) {
  const router = useRouter();
  const { data: sessionData, isPending } = authClient.useSession();
  const [market, setMarket] = useState<PredictionMarketView>(initialMarket);
  const [submitting, setSubmitting] = useState(false);
  const [likeSubmitting, setLikeSubmitting] = useState(false);

  const userId = sessionData?.user?.id ?? null;
  const votingEnabled = useMemo(() => Boolean(userId), [userId]);
  const canVote = isOpenForVoting(market);

  async function onVote(marketId: number, optionId: number) {
    if (!votingEnabled) {
      router.push(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }
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

  async function onLike(marketId: number) {
    if (!votingEnabled) {
      router.push(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }
    setLikeSubmitting(true);
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
        setMarket(body.market);
      }
    } catch {
      toast.error("Could not update reaction.");
    } finally {
      setLikeSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white">
      <FeedDesktopRail active="home" />

      <div className="pb-16 pt-2 md:pl-16">
        <div className="mx-auto w-full max-w-[640px] px-2 sm:px-4">
          <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0a0a]/95 px-4 py-3 text-center backdrop-blur">
            <span className="text-sm font-semibold text-white">Post</span>
          </div>

          <section className="mt-3 overflow-hidden rounded-3xl border border-white/10 bg-[#0f0f10] shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
            <div className="border-b border-white/10 px-5 py-3 text-sm">
              <Link href="/feed" className="font-semibold text-white/80 hover:text-white">
                ← Back to feed
              </Link>
            </div>

            {!votingEnabled && !isPending ? (
              <div className="border-b border-white/10 bg-white/[0.02] px-5 py-3 text-sm text-white/75">
                Vote and reply by{" "}
                <Link
                  href={`/login?next=${encodeURIComponent(nextPath)}`}
                  className="font-semibold text-white hover:underline"
                >
                  signing in
                </Link>{" "}
                or{" "}
                <Link
                  href={`/register?next=${encodeURIComponent(nextPath)}`}
                  className="font-semibold text-white hover:underline"
                >
                  creating an account
                </Link>
                .
              </div>
            ) : null}

            <PredictionMarketCard
              market={market}
              canVote={canVote}
              submitting={submitting}
              onVote={onVote}
              onLike={onLike}
              likeSubmitting={likeSubmitting}
              headingLevel="h1"
              style="threadDark"
              showDiscussLink
            />

            <PredictionMarketComments slug={slug} nextPath={nextPath} theme="dark" />

            {!votingEnabled && !isPending ? (
              <div className="px-5 py-4">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  onClick={() => router.push(`/login?next=${encodeURIComponent(nextPath)}`)}
                >
                  Sign in to vote
                </Button>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
