"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CirclePlus,
  FileText,
  Gift,
  Image as ImageIcon,
  ListFilter,
  MapPin,
  MessageSquareText,
  Smile,
} from "lucide-react";
import { toast } from "sonner";
import { PredictionMarketCard, isOpenForVoting } from "@/components/predictions/prediction-market-card";
import type { PredictionMarketView } from "@/lib/predictions/queries";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FeedDesktopRail } from "@/components/predictions/feed-desktop-rail";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const PAGE_SIZE = 10;

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialMarkets.length >= PAGE_SIZE);
  const [offset, setOffset] = useState(initialMarkets.length);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composeTopic, setComposeTopic] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  async function onVote(marketId: number, optionId: number) {
    if (!votingEnabled) {
      router.push("/login?next=%2Ffeed");
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
        return;
      }
      if (body.market) {
        setMarkets((prev) => prev.map((m) => (m.id === body.market!.id ? body.market! : m)));
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
      router.push("/login?next=%2Ffeed");
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
        setMarkets((prev) => prev.map((m) => (m.id === body.market!.id ? body.market! : m)));
      }
    } catch {
      toast.error("Could not update reaction.");
    } finally {
      setLikeSubmitting(null);
    }
  }

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/predictions?limit=${PAGE_SIZE}&offset=${offset}`, {
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as {
        markets?: PredictionMarketView[];
        hasMore?: boolean;
        nextOffset?: number;
        error?: string;
      };
      if (!res.ok) {
        toast.error(body.error ?? "Could not load more predictions.");
        return;
      }
      const next = body.markets ?? [];
      setMarkets((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const deduped = next.filter((m) => !seen.has(m.id));
        return [...prev, ...deduped];
      });
      setHasMore(Boolean(body.hasMore));
      setOffset(typeof body.nextOffset === "number" ? body.nextOffset : offset + next.length);
    } catch {
      toast.error("Could not load more predictions.");
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, offset]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  function onPostCompose() {
    if (!votingEnabled) {
      router.push("/login?next=%2Ffeed");
      return;
    }
    if (!composeBody.trim()) return;
    toast.success("Post composer ready. Publishing flow can be wired next.");
    setComposerOpen(false);
    setComposeTopic("");
    setComposeBody("");
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white">
      <FeedDesktopRail active="home" />

      <div className="pb-24 pt-2 md:pl-16">
        <div className="mx-auto w-full max-w-[640px] px-2 sm:px-4">
          <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0a0a]/95 px-4 py-3 text-center backdrop-blur">
            <span className="text-sm font-semibold text-white">For you</span>
          </div>

          <section className="mt-3 overflow-hidden rounded-3xl border border-white/10 bg-[#0f0f10] shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
            <div className="border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-9 border border-white/20">
                  <AvatarImage src={sessionData?.user?.image ?? undefined} alt="" />
                  <AvatarFallback className="bg-white/10 text-[11px] text-white">
                    {(sessionData?.user?.name ?? "You").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="flex-1 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-left text-sm text-white/45 transition hover:bg-white/[0.06]"
                >
                  What&apos;s new?
                </button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full bg-white px-4 text-black hover:bg-white/90"
                  onClick={() => setComposerOpen(true)}
                >
                  Post
                </Button>
              </div>
            </div>

            <div>
              {markets.map((m) => (
                <PredictionMarketCard
                  key={m.id}
                  market={m}
                  canVote={isOpenForVoting(m)}
                  submitting={submitting === m.id}
                  onVote={onVote}
                  onLike={onLike}
                  likeSubmitting={likeSubmitting === m.id}
                  showDiscussLink
                  style="threadDark"
                  enableCardOpen
                  onOpenDetail={(slug) => router.push(`/predictions/${slug}`)}
                />
              ))}
            </div>

            <div
              ref={sentinelRef}
              className="border-t border-white/10 px-5 py-4 text-center text-sm text-white/60"
            >
              {loadingMore ? "Loading more..." : hasMore ? "Keep scrolling" : "You reached the end"}
            </div>
          </section>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setComposerOpen(true)}
        className="fixed bottom-7 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-black shadow-xl transition hover:scale-[1.03]"
      >
        <CirclePlus size={28} />
      </button>

      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[min(980px,calc(100%-1.5rem))] gap-0 border-white/10 bg-[#0f0f10] p-0 text-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <DialogClose asChild>
              <button
                type="button"
                className="text-[34px] font-light leading-none text-white/80 transition hover:text-white"
              >
                Cancel
              </button>
            </DialogClose>
            <DialogTitle className="text-4xl font-semibold tracking-tight">New thread</DialogTitle>
            <Button
              type="button"
              onClick={onPostCompose}
              disabled={!composeBody.trim()}
              className="h-12 rounded-2xl bg-white px-8 text-lg font-semibold text-black hover:bg-white/90 disabled:opacity-40"
            >
              Post
            </Button>
          </div>

          <div className="px-6 py-6">
            <div className="flex gap-4">
              <Avatar className="size-14 border border-white/20">
                <AvatarImage src={sessionData?.user?.image ?? undefined} alt="" />
                <AvatarFallback className="bg-white/10 text-sm text-white">
                  {(sessionData?.user?.name ?? "You").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="mb-2 text-3xl font-semibold text-white">
                  {sessionData?.user?.name ?? "You"}
                </div>
                <input
                  value={composeTopic}
                  onChange={(e) => setComposeTopic(e.target.value)}
                  placeholder="Add a topic"
                  className="mb-3 w-full border-none bg-transparent p-0 text-[34px] font-medium text-white placeholder:text-white/40 outline-none"
                />
                <Textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="What's new?"
                  rows={4}
                  className="min-h-[120px] resize-none border-none bg-transparent p-0 text-2xl text-white placeholder:text-white/45 shadow-none outline-none focus-visible:ring-0"
                />

                <div className="mt-4 flex flex-wrap items-center gap-4 text-white/70">
                  <button type="button" className="rounded-lg p-2 hover:bg-white/10"><ImageIcon size={24} /></button>
                  <button type="button" className="rounded-lg p-2 hover:bg-white/10"><Gift size={24} /></button>
                  <button type="button" className="rounded-lg p-2 hover:bg-white/10"><Smile size={24} /></button>
                  <button type="button" className="rounded-lg p-2 hover:bg-white/10"><ListFilter size={24} /></button>
                  <button type="button" className="rounded-lg p-2 hover:bg-white/10"><MessageSquareText size={24} /></button>
                  <button type="button" className="rounded-lg p-2 hover:bg-white/10"><MapPin size={24} /></button>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <button
                type="button"
                className="inline-flex items-center gap-3 text-2xl font-medium text-white/80 hover:text-white"
              >
                <FileText size={30} />
                Add to thread
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

