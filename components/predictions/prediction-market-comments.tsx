"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import type {
  PredictionCommentAuthorView,
  PredictionCommentNodeView,
} from "@/lib/predictions/comments-public";
import { PREDICTION_COMMENT_MAX_LENGTH } from "@/lib/predictions/comments-public";

function displayAuthor(a: PredictionCommentAuthorView) {
  const u = a.username?.trim();
  if (u) return `@${u}`;
  return a.name;
}

function initials(a: PredictionCommentAuthorView) {
  const base = displayAuthor(a).replace(/^@/, "");
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return base.slice(0, 2).toUpperCase() || "?";
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function relativeTime(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.floor(diff / min))}m`;
  if (diff < day) return `${Math.floor(diff / hour)}h`;
  return `${Math.floor(diff / day)}d`;
}

function CommentBlock({
  node,
  depth,
  slug,
  nextPath,
  onPosted,
  viewerId,
  dark,
}: {
  node: PredictionCommentNodeView;
  depth: 0 | 1;
  slug: string;
  nextPath: string;
  onPosted: () => void;
  viewerId: string | null;
  dark: boolean;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canReply = depth === 0 && viewerId;

  async function submitReply() {
    if (!viewerId) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/predictions/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: replyBody, parentId: node.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not post reply.");
        return;
      }
      setReplyBody("");
      setReplyOpen(false);
      toast.success("Reply posted.");
      onPosted();
    } catch {
      toast.error("Could not post reply.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className={depth === 1 ? (dark ? "ml-11 border-l border-white/15 pl-4" : "ml-11 border-l border-slate-200 pl-4") : ""}>
      <div className="flex gap-3">
        <Avatar className={dark ? "size-10 border border-white/20" : "size-10 border border-slate-200"}>
          {node.author.image ? <AvatarImage src={node.author.image} alt="" /> : null}
          <AvatarFallback className={dark ? "bg-white/10 text-xs text-white" : "text-xs"}>
            {initials(node.author)}
          </AvatarFallback>
        </Avatar>
        <div className={dark ? "min-w-0 flex-1 border-b border-white/10 pb-4" : "min-w-0 flex-1 border-b border-slate-100 pb-4"}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={dark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-slate-900"}>
              {displayAuthor(node.author)}
            </span>
            <span className={dark ? "text-xs text-white/45" : "text-xs text-slate-400"} title={formatTime(node.createdAt)}>
              {relativeTime(node.createdAt)}
            </span>
          </div>
          <p className={dark ? "mt-1 whitespace-pre-wrap text-[15px] leading-6 text-white/90" : "mt-1 whitespace-pre-wrap text-[15px] leading-6 text-slate-800"}>
            {node.body}
          </p>

          <div className={dark ? "mt-2 flex items-center gap-4 text-xs text-white/55" : "mt-2 flex items-center gap-4 text-xs text-slate-500"}>
            {canReply ? (
              <button
                type="button"
                onClick={() => setReplyOpen((v) => !v)}
                className={dark ? "font-semibold hover:text-white" : "font-semibold hover:text-slate-900"}
              >
                Reply
              </button>
            ) : null}
            <span>{formatTime(node.createdAt)}</span>
          </div>

          {canReply && replyOpen ? (
            <div className={dark ? "mt-3 space-y-2 rounded-xl border border-white/20 bg-white/[0.04] p-3" : "mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3"}>
              <Textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Post your reply"
                maxLength={PREDICTION_COMMENT_MAX_LENGTH}
                rows={3}
                className={dark ? "border-white/20 bg-black/20 text-sm text-white placeholder:text-white/40" : "bg-white text-sm"}
              />
              <div className="flex items-center justify-between">
                <span className={dark ? "text-xs text-white/50" : "text-xs text-slate-500"}>
                  {replyBody.length}/{PREDICTION_COMMENT_MAX_LENGTH}
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className={dark ? "bg-white text-black hover:bg-white/90" : ""}
                    disabled={submitting || replyBody.trim().length === 0}
                    onClick={() => void submitReply()}
                  >
                    Reply
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={submitting}
                    onClick={() => {
                      setReplyOpen(false);
                      setReplyBody("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {depth === 0 && !viewerId ? (
            <p className={dark ? "mt-2 text-xs text-white/55" : "mt-2 text-xs text-slate-500"}>
              <Link
                href={`/login?next=${encodeURIComponent(nextPath)}`}
                className={dark ? "font-semibold text-white/85 hover:text-white" : "font-semibold hover:text-slate-900"}
              >
                Sign in
              </Link>{" "}
              to reply.
            </p>
          ) : null}
        </div>
      </div>

      {node.replies?.length ? (
        <div className="mt-3 space-y-3">
          {node.replies.map((r) => (
            <CommentBlock
              key={r.id}
              node={r}
              depth={1}
              slug={slug}
              nextPath={nextPath}
              onPosted={onPosted}
              viewerId={viewerId}
              dark={dark}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function PredictionMarketComments({
  slug,
  nextPath,
  theme = "light",
}: {
  slug: string;
  nextPath: string;
  theme?: "light" | "dark";
}) {
  const { data: sessionData, isPending: sessionPending } = authClient.useSession();
  const viewerId = sessionData?.user?.id ?? null;

  const [comments, setComments] = useState<PredictionCommentNodeView[]>([]);
  const [loading, setLoading] = useState(true);
  const [topBody, setTopBody] = useState("");
  const [submittingTop, setSubmittingTop] = useState(false);
  const dark = theme === "dark";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/predictions/${encodeURIComponent(slug)}/comments`, {
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        comments?: PredictionCommentNodeView[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "Could not load comments.");
        setComments([]);
        return;
      }
      setComments(data.comments ?? []);
    } catch {
      toast.error("Could not load comments.");
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitTop() {
    if (!viewerId) return;
    setSubmittingTop(true);
    try {
      const res = await fetch(`/api/predictions/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: topBody }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not post comment.");
        return;
      }
      setTopBody("");
      toast.success("Comment posted.");
      await load();
    } catch {
      toast.error("Could not post comment.");
    } finally {
      setSubmittingTop(false);
    }
  }

  return (
    <section className={dark ? "overflow-hidden bg-transparent" : "overflow-hidden bg-white"}>
      <header className={dark ? "border-b border-white/10 px-5 py-3" : "border-b border-slate-200 px-5 py-3"}>
        <h2 className={dark ? "text-base font-bold tracking-tight text-white" : "text-base font-bold tracking-tight text-slate-900"}>Replies</h2>
      </header>

      {!sessionPending && viewerId ? (
        <div className={dark ? "border-b border-white/10 px-5 py-4" : "border-b border-slate-200 px-5 py-4"}>
          <div className="space-y-2">
          <Textarea
            value={topBody}
            onChange={(e) => setTopBody(e.target.value)}
            placeholder="What are your thoughts?"
            maxLength={PREDICTION_COMMENT_MAX_LENGTH}
            rows={3}
            className={dark ? "rounded-xl border-white/20 bg-black/20 text-sm text-white placeholder:text-white/40" : "rounded-xl border-slate-300 text-sm"}
          />
          <div className="flex items-center justify-between gap-3">
            <span className={dark ? "text-xs text-white/50" : "text-xs text-slate-500"}>
              {topBody.length}/{PREDICTION_COMMENT_MAX_LENGTH}
            </span>
            <Button
              type="button"
              size="sm"
              className={dark ? "bg-white text-black hover:bg-white/90" : ""}
              disabled={submittingTop || topBody.trim().length === 0}
              onClick={() => void submitTop()}
            >
              Post
            </Button>
          </div>
        </div>
        </div>
      ) : !sessionPending ? (
        <div className={dark ? "border-b border-white/10 bg-white/[0.02] px-5 py-4 text-sm text-white/75" : "border-b border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700"}>
          <Link
            href={`/login?next=${encodeURIComponent(nextPath)}`}
            className={dark ? "font-semibold text-white hover:underline" : "font-semibold hover:underline"}
          >
            Sign in
          </Link>{" "}
          or{" "}
          <Link
            href={`/register?next=${encodeURIComponent(nextPath)}`}
            className={dark ? "font-semibold text-white hover:underline" : "font-semibold hover:underline"}
          >
            create an account
          </Link>{" "}
          to join the thread.
        </div>
      ) : null}

      <div className="px-5 py-3">
        {loading ? (
          <p className={dark ? "text-sm text-white/60" : "text-sm text-slate-500"}>Loading comments…</p>
        ) : comments.length === 0 ? (
          <p className={dark ? "text-sm text-white/60" : "text-sm text-slate-500"}>No posts yet. Start the conversation.</p>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => (
              <CommentBlock
                key={c.id}
                node={c}
                depth={0}
                slug={slug}
                nextPath={nextPath}
                onPosted={() => void load()}
                viewerId={viewerId}
                dark={dark}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
