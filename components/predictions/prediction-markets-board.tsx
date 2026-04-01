"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { PredictionMarketView } from "@/lib/predictions/queries";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

function isOpenForVoting(m: PredictionMarketView, now = new Date()): boolean {
  if (m.status !== "open") return false;
  if (m.opensAt && now < new Date(m.opensAt)) return false;
  if (m.locksAt && now >= new Date(m.locksAt)) return false;
  return true;
}

function lockLabel(m: PredictionMarketView): string {
  if (m.status === "resolved") return "Resolved";
  if (m.status === "locked") return "Locked";
  if (m.locksAt) {
    return `Closes ${new Date(m.locksAt).toLocaleString()}`;
  }
  return "Open";
}

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
          <article
            key={m.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  {m.title}
                </h2>
                {m.description ? (
                  <p className="mt-1 text-sm text-slate-600">{m.description}</p>
                ) : null}
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {lockLabel(m)}
              </div>
            </div>

            <div className="space-y-2.5">
              {m.options.map((o) => {
                const mine = m.viewerVoteOptionId === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => void onVote(m.id, o.id)}
                    disabled={!canVote || submitting === m.id}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      mine
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    } ${
                      !canVote || submitting === m.id
                        ? "cursor-not-allowed opacity-80"
                        : ""
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-900">
                        {o.label}
                        {mine ? (
                          <span className="ml-2 text-xs font-semibold text-emerald-700">
                            Your vote
                          </span>
                        ) : null}
                      </span>
                      <span className="text-sm font-semibold text-slate-700">
                        {o.percentage}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full ${
                          mine ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                        style={{ width: `${o.percentage}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>{m.totalVotes.toLocaleString()} total votes</span>
              {canVote ? (
                m.viewerVoteOptionId != null ? (
                  <span className="font-semibold text-emerald-700">
                    Your vote is in. You can still change it.
                  </span>
                ) : (
                  <span>Choose one option</span>
                )
              ) : (
                <span>Voting closed</span>
              )}
            </div>
          </article>
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
