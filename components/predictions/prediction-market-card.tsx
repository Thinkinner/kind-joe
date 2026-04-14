import Link from "next/link";
import { Clock3, Ellipsis, Heart, MessageCircle, Send, Users } from "lucide-react";
import type { PredictionMarketView } from "@/lib/predictions/queries";
import { PREDICTION_CATEGORY_LABELS } from "@/lib/predictions/categories";

export function isOpenForVoting(m: PredictionMarketView, now = new Date()): boolean {
  if (m.status !== "open") return false;
  if (m.opensAt && now < new Date(m.opensAt)) return false;
  if (m.locksAt && now >= new Date(m.locksAt)) return false;
  return true;
}

export function lockLabel(m: PredictionMarketView): string {
  if (m.status === "resolved") return "Resolved";
  if (m.status === "locked") return "Locked";
  if (m.locksAt) {
    return `Closes ${new Date(m.locksAt).toLocaleString()}`;
  }
  return "Open";
}

function createdAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.floor(diff / min))}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  return `${Math.floor(diff / day)}d ago`;
}

function endsInLabel(m: PredictionMarketView): string {
  if (!m.locksAt) return lockLabel(m);
  const now = Date.now();
  const lockTs = new Date(m.locksAt).getTime();
  const diff = lockTs - now;
  if (!Number.isFinite(lockTs) || diff <= 0) return "Ended";
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  if (diff < hour) return "Ends in under 1 hour";
  if (diff < day) return `Ends in about ${Math.ceil(diff / hour)} hours`;
  const days = Math.ceil(diff / day);
  return `Ends in about ${days} day${days > 1 ? "s" : ""}`;
}

export function PredictionMarketCard({
  market: m,
  canVote,
  submitting,
  onVote,
  headingLevel = "h2",
  showDiscussLink = false,
  style = "card",
  enableCardOpen = false,
  onOpenDetail,
  onLike,
  likeSubmitting = false,
  variant = "default",
  canManage = false,
  onEdit,
  onDelete,
}: {
  market: PredictionMarketView;
  canVote: boolean;
  submitting: boolean;
  onVote: (marketId: number, optionId: number) => void;
  headingLevel?: "h1" | "h2";
  showDiscussLink?: boolean;
  style?: "card" | "feed" | "threadDark";
  enableCardOpen?: boolean;
  onOpenDetail?: (slug: string) => void;
  onLike?: (marketId: number) => void;
  likeSubmitting?: boolean;
  variant?: "default" | "hero" | "compact";
  canManage?: boolean;
  onEdit?: (market: PredictionMarketView) => void;
  onDelete?: (market: PredictionMarketView) => void;
}) {
  const HeadingTag = headingLevel;
  const feed = style === "feed";
  const threadDark = style === "threadDark";
  const hero = variant === "hero";
  const compact = variant === "compact";

  function shouldIgnoreCardOpen(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest(
        "button, a, input, textarea, select, label, [data-no-card-open='true']",
      ),
    );
  }

  function openDetail() {
    if (!enableCardOpen || !onOpenDetail) return;
    onOpenDetail(m.slug);
  }

  const detailPath = `/predictions/${m.slug}`;
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    "https://kindjoe.news";
  const shareUrl = `${baseUrl}${detailPath}`;
  const encoded = encodeURIComponent(shareUrl);
  const shareLinks = {
    x: `https://twitter.com/intent/tweet?url=${encoded}&text=${encodeURIComponent(
      m.title,
    )}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${m.title} ${shareUrl}`)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
  };
  const posterName = m.authorName?.trim() || "Someone";
  const categoryLabel = PREDICTION_CATEGORY_LABELS[m.category];
  const shownOptions = compact ? m.options.slice(0, Math.min(2, m.options.length)) : m.options;
  const hiddenOptionsCount = Math.max(0, m.options.length - shownOptions.length);
  const twoOptionThreadCard = threadDark && m.options.length === 2;
  const yesOption = m.options[0] ?? null;
  const noOption = m.options[1] ?? null;
  const referenceCompact = threadDark && compact && yesOption && noOption;

  if (referenceCompact) {
    return (
      <article
        role={enableCardOpen ? "button" : undefined}
        tabIndex={enableCardOpen ? 0 : undefined}
        onClick={(e) => {
          if (!enableCardOpen) return;
          if (shouldIgnoreCardOpen(e.target)) return;
          openDetail();
        }}
        onKeyDown={(e) => {
          if (!enableCardOpen) return;
          if (e.key !== "Enter" && e.key !== " ") return;
          if (shouldIgnoreCardOpen(e.target)) return;
          e.preventDefault();
          openDetail();
        }}
        className={`rounded-xl border border-[#27272a] bg-[#121214] p-6 ${
          enableCardOpen ? "cursor-pointer" : ""
        }`}
        style={{ backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)" }}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#4B6FD0]">
            {categoryLabel}
          </p>
          {canManage ? (
            <details data-no-card-open="true" className="relative">
              <summary className="inline-flex list-none cursor-pointer items-center rounded-md p-1 text-[#a1a1aa] hover:bg-[#1c1c1f] hover:text-white">
                <Ellipsis size={14} />
              </summary>
              <div
                data-no-card-open="true"
                className="absolute right-0 top-7 z-20 w-32 rounded-md border border-[#27272a] bg-[#121214] p-1 text-sm"
              >
                <button
                  type="button"
                  data-no-card-open="true"
                  className="block w-full rounded px-2 py-1.5 text-left text-white/85 hover:bg-[#1c1c1f]"
                  onClick={() => onEdit?.(m)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  data-no-card-open="true"
                  className="block w-full rounded px-2 py-1.5 text-left text-red-300 hover:bg-[#1c1c1f]"
                  onClick={() => onDelete?.(m)}
                >
                  Delete
                </button>
              </div>
            </details>
          ) : null}
        </div>

        <HeadingTag className="mb-4 text-[20px] font-bold leading-[1.1] tracking-[-0.5px] text-white">
          {m.title}
        </HeadingTag>

        <div className="mb-6 flex items-center gap-4 text-[13px] text-[#a1a1aa]">
          <span className="inline-flex items-center gap-1">
            <Users size={14} />
            {m.totalVotes.toLocaleString()} predictions
          </span>
          <span>•</span>
          <span>{endsInLabel(m)}</span>
        </div>

        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="mb-1 text-[12px] uppercase text-[#a1a1aa]">Current Probability</p>
            <p className="text-[32px] font-extrabold leading-none text-white">{yesOption.percentage}%</p>
          </div>
          <div className="text-right">
            <p className="mb-1 text-[12px] uppercase text-[#a1a1aa]">No Probability</p>
            <p className="text-[16px] font-bold text-[#ef4444]">{noOption.percentage}%</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            data-no-card-open="true"
            onClick={() => void onVote(m.id, yesOption.id)}
            disabled={!canVote || submitting}
            className={`h-14 rounded-lg text-[16px] font-bold transition ${
              m.viewerVoteOptionId === yesOption.id
                ? "border-2 border-white bg-[#102A80] text-white"
                : "bg-[#102A80] text-white hover:bg-[#1A3EA0]"
            } ${!canVote || submitting ? "cursor-not-allowed opacity-70" : ""}`}
          >
            {m.viewerVoteOptionId === yesOption.id
              ? `Predicted ${yesOption.label}`
              : `Predict ${yesOption.label}`}
          </button>
          <button
            type="button"
            data-no-card-open="true"
            onClick={() => void onVote(m.id, noOption.id)}
            disabled={!canVote || submitting}
            className={`h-14 rounded-lg text-[16px] font-bold transition ${
              m.viewerVoteOptionId === noOption.id
                ? "border-2 border-white bg-[#ef4444] text-white"
                : "bg-[#ef4444] text-white hover:opacity-90"
            } ${!canVote || submitting ? "cursor-not-allowed opacity-70" : ""}`}
          >
            {m.viewerVoteOptionId === noOption.id
              ? `Predicted ${noOption.label}`
              : `Predict ${noOption.label}`}
          </button>
        </div>
      </article>
    );
  }

  return (
    <article
      role={enableCardOpen ? "button" : undefined}
      tabIndex={enableCardOpen ? 0 : undefined}
      onClick={(e) => {
        if (!enableCardOpen) return;
        if (shouldIgnoreCardOpen(e.target)) return;
        openDetail();
      }}
      onKeyDown={(e) => {
        if (!enableCardOpen) return;
        if (e.key !== "Enter" && e.key !== " ") return;
        if (shouldIgnoreCardOpen(e.target)) return;
        e.preventDefault();
        openDetail();
      }}
      className={
        threadDark
          ? `${hero ? "rounded-2xl border border-white/12 bg-[linear-gradient(150deg,#0f1319_0%,#0a0d12_100%)] shadow-[0_10px_40px_rgba(0,0,0,0.45)]" : "border-b border-white/10 bg-[linear-gradient(150deg,#0f1319_0%,#0a0d12_100%)]"} ${hero ? "p-6" : "px-5 py-5"} ${
              enableCardOpen ? "cursor-pointer" : ""
            }`
          : feed
          ? `border-b border-slate-200 bg-white px-5 py-4 ${
              enableCardOpen ? "cursor-pointer" : ""
            }`
          : `rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${
              enableCardOpen ? "cursor-pointer" : ""
            }`
      }
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            {canManage ? (
              <details data-no-card-open="true" className="relative">
                <summary
                  className={
                    threadDark
                      ? "inline-flex list-none cursor-pointer items-center rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white"
                      : "inline-flex list-none cursor-pointer items-center rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }
                >
                  <Ellipsis size={14} />
                </summary>
                <div
                  data-no-card-open="true"
                  className={
                    threadDark
                      ? "absolute left-0 top-7 z-20 w-32 rounded-md border border-white/20 bg-[#151515] p-1 text-sm"
                      : "absolute left-0 top-7 z-20 w-32 rounded-md border border-slate-200 bg-white p-1 text-sm shadow-md"
                  }
                >
                  <button
                    type="button"
                    data-no-card-open="true"
                    className={
                      threadDark
                        ? "block w-full rounded px-2 py-1.5 text-left text-white/85 hover:bg-white/10"
                        : "block w-full rounded px-2 py-1.5 text-left text-slate-700 hover:bg-slate-100"
                    }
                    onClick={() => onEdit?.(m)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    data-no-card-open="true"
                    className={
                      threadDark
                        ? "block w-full rounded px-2 py-1.5 text-left text-red-300 hover:bg-white/10"
                        : "block w-full rounded px-2 py-1.5 text-left text-red-600 hover:bg-slate-100"
                    }
                    onClick={() => onDelete?.(m)}
                  >
                    Delete
                  </button>
                </div>
              </details>
            ) : null}
            <p
              className={
                threadDark
                  ? "text-xs font-bold uppercase tracking-[0.18em] text-[#4B6FD0]"
                  : "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
              }
            >
              {categoryLabel}
            </p>
          </div>
          <HeadingTag
            className={
              headingLevel === "h1"
                ? threadDark
                  ? hero
                    ? "text-2xl font-bold tracking-tight text-white sm:text-[2rem]"
                    : "text-xl font-bold tracking-tight text-white sm:text-[1.7rem]"
                  : feed
                  ? "text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl"
                  : "text-2xl font-black tracking-tight text-slate-900 sm:text-3xl"
                : threadDark
                  ? compact
                    ? "text-[20px] font-bold leading-[1.15] tracking-tight text-white"
                    : "text-[28px] font-extrabold leading-[1.08] tracking-tight text-white sm:text-[34px]"
                  : "text-lg font-semibold tracking-tight text-slate-900 sm:text-xl"
            }
          >
            {m.title}
          </HeadingTag>
          {m.description ? (
            <p className={threadDark ? "mt-1 text-sm text-white/70" : "mt-1 text-sm text-slate-600"}>
              {m.description}
            </p>
          ) : null}
          {!threadDark && m.createdAt ? (
            <p className="mt-1 text-xs text-slate-500">Posted {createdAgo(m.createdAt)}</p>
          ) : null}
        </div>
        <div
          className={
            threadDark
              ? "rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/80"
              : feed
              ? "rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
              : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
          }
        >
          {threadDark ? endsInLabel(m) : lockLabel(m)}
        </div>
      </div>

      {m.status === "resolved" && m.winningOptionLabel ? (
        <div
          className={
            threadDark
              ? "mb-3 rounded-xl border border-[#4B6FD0]/40 bg-[#4B6FD0]/10 px-3 py-2 text-xs text-[#93ACF0]"
              : "mb-3 rounded-xl border border-[#4B6FD0]/30 bg-[#4B6FD0]/10 px-3 py-2 text-xs text-[#1A3EA0]"
          }
        >
          Result: <span className="font-semibold">{m.winningOptionLabel}</span>
        </div>
      ) : null}

      {twoOptionThreadCard && yesOption && noOption ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-[13px] text-white/75">
            <span className="inline-flex items-center gap-1.5">
              <Users size={14} />
              {m.totalVotes.toLocaleString()} predictions
            </span>
            <span className="text-white/35">•</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={14} />
              {endsInLabel(m)}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
                Current probability
              </p>
              <p className="mt-1 text-[46px] font-extrabold leading-none text-white">
                {yesOption.percentage}%
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
                {noOption.label} probability
              </p>
              <p className="mt-1 text-[34px] font-extrabold leading-none text-rose-500">
                {noOption.percentage}%
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              data-no-card-open="true"
              onClick={() => void onVote(m.id, yesOption.id)}
              disabled={!canVote || submitting}
              className={`h-14 rounded-xl bg-[#102A80] px-5 text-base font-extrabold text-white transition hover:bg-[#1A3EA0] ${
                m.viewerVoteOptionId === yesOption.id ? "ring-2 ring-white/80 ring-offset-2 ring-offset-[#0f141b]" : ""
              } ${!canVote || submitting ? "cursor-not-allowed opacity-70" : ""}`}
            >
              Predict {yesOption.label.toUpperCase()}
            </button>
            <button
              type="button"
              data-no-card-open="true"
              onClick={() => void onVote(m.id, noOption.id)}
              disabled={!canVote || submitting}
              className={`h-14 rounded-xl bg-rose-500 px-5 text-base font-extrabold text-white transition hover:bg-rose-400 ${
                m.viewerVoteOptionId === noOption.id ? "ring-2 ring-white/80 ring-offset-2 ring-offset-[#0f141b]" : ""
              } ${!canVote || submitting ? "cursor-not-allowed opacity-70" : ""}`}
            >
              Predict {noOption.label.toUpperCase()}
            </button>
          </div>
        </div>
      ) : (
        <div className={feed || threadDark ? (compact ? "space-y-2" : "space-y-2.5") : "space-y-2.5"}>
        {shownOptions.map((o) => {
          const mine = m.viewerVoteOptionId === o.id;
          return (
            <button
              key={o.id}
              type="button"
              data-no-card-open="true"
              onClick={() => void onVote(m.id, o.id)}
              disabled={!canVote || submitting}
              className={`w-full border ${compact ? "px-2.5 py-2.5" : "px-3 py-3"} text-left transition ${
                threadDark
                  ? mine
                    ? "border-white/40 bg-white/12"
                    : "border-white/15 bg-white/[0.03] hover:bg-white/[0.07]"
                  : mine
                    ? "border-sky-500 bg-sky-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
              } ${!canVote || submitting ? "cursor-not-allowed opacity-80" : ""}`}
              style={feed || threadDark ? { borderRadius: 16 } : undefined}
            >
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className={threadDark ? `${compact ? "text-[13px]" : "text-sm"} font-medium text-white` : "text-sm font-medium text-slate-900"}>
                  {o.label}
                  {mine ? (
                    <span
                      className={
                        threadDark
                          ? "ml-2 text-xs font-semibold text-white/80"
                          : "ml-2 text-xs font-semibold text-sky-700"
                      }
                    >
                      Your vote
                    </span>
                  ) : null}
                </span>
                <span className={threadDark ? `${compact ? "text-xs" : "text-sm"} font-semibold text-white/80` : "text-sm font-semibold text-slate-700"}>
                  {o.percentage}%
                </span>
              </div>
              <div className={threadDark ? "h-2 w-full rounded-full bg-white/12" : "h-2 w-full rounded-full bg-slate-100"}>
                <div
                  className={`h-2 rounded-full ${
                    threadDark ? (mine ? "bg-white" : "bg-white/45") : mine ? "bg-sky-500" : "bg-slate-400"
                  }`}
                  style={{ width: `${o.percentage}%` }}
                />
              </div>
              <div
                className={
                  threadDark
                    ? "mt-1.5 text-[11px] text-white/55"
                    : "mt-1.5 text-[11px] text-slate-500"
                }
              >
                {o.votes.toLocaleString()} votes
              </div>
            </button>
          );
        })}
        {hiddenOptionsCount > 0 ? (
          <p className={threadDark ? "text-xs text-white/50" : "text-xs text-slate-500"}>
            +{hiddenOptionsCount} more option{hiddenOptionsCount > 1 ? "s" : ""}
          </p>
        ) : null}
        </div>
      )}

      <div className={threadDark ? "mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-white/55" : "mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"}>
        <span>
          {threadDark ? `${posterName} • ${m.totalVotes.toLocaleString()} total votes` : `${m.totalVotes.toLocaleString()} total votes`}
        </span>
        {canVote ? (
          m.viewerVoteOptionId != null ? (
            <span className={threadDark ? "font-semibold text-white" : "font-semibold text-sky-700"}>
              Your vote is in. You can still change it.
            </span>
          ) : (
            <span>Choose one option</span>
          )
        ) : (
          <span>Voting closed</span>
        )}
      </div>

      {showDiscussLink ? (
        <div className={threadDark ? "mt-4 border-t border-white/10 pt-3" : "mt-4 border-t border-slate-100 pt-3"}>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              data-no-card-open="true"
              disabled={likeSubmitting}
              onClick={() => onLike?.(m.id)}
              className={
                threadDark
                  ? "inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white disabled:opacity-60"
                  : "inline-flex items-center gap-1.5 text-sm text-slate-700 hover:text-slate-900 disabled:opacity-60"
              }
            >
              <Heart
                size={16}
                className={m.viewerLiked ? "fill-current" : ""}
              />
              <span>{m.likeCount.toLocaleString()}</span>
            </button>

            <Link
              href={detailPath}
              data-no-card-open="true"
              className={
                threadDark
                  ? "inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white"
                  : "inline-flex items-center gap-1.5 text-sm text-slate-700 hover:text-slate-900"
              }
            >
              <MessageCircle size={16} />
              <span>{m.commentCount.toLocaleString()}</span>
            </Link>

            <details data-no-card-open="true" className="relative">
              <summary
                className={
                  threadDark
                    ? "inline-flex cursor-pointer list-none items-center gap-1.5 text-sm text-white/80 hover:text-white"
                    : "inline-flex cursor-pointer list-none items-center gap-1.5 text-sm text-slate-700 hover:text-slate-900"
                }
              >
                <Send size={16} />
                <span>Share</span>
              </summary>
              <div
                data-no-card-open="true"
                className={
                  threadDark
                    ? "absolute left-0 top-7 z-20 w-44 rounded-lg border border-white/20 bg-[#151515] p-2 text-sm"
                    : "absolute left-0 top-7 z-20 w-44 rounded-lg border border-slate-200 bg-white p-2 text-sm shadow-md"
                }
              >
                <a data-no-card-open="true" href={shareLinks.x} target="_blank" rel="noreferrer" className={threadDark ? "block rounded px-2 py-1.5 text-white/85 hover:bg-white/10" : "block rounded px-2 py-1.5 text-slate-700 hover:bg-slate-100"}>Share on X</a>
                <a data-no-card-open="true" href={shareLinks.facebook} target="_blank" rel="noreferrer" className={threadDark ? "block rounded px-2 py-1.5 text-white/85 hover:bg-white/10" : "block rounded px-2 py-1.5 text-slate-700 hover:bg-slate-100"}>Share on Facebook</a>
                <a data-no-card-open="true" href={shareLinks.whatsapp} target="_blank" rel="noreferrer" className={threadDark ? "block rounded px-2 py-1.5 text-white/85 hover:bg-white/10" : "block rounded px-2 py-1.5 text-slate-700 hover:bg-slate-100"}>Share on WhatsApp</a>
                <a data-no-card-open="true" href={shareLinks.linkedin} target="_blank" rel="noreferrer" className={threadDark ? "block rounded px-2 py-1.5 text-white/85 hover:bg-white/10" : "block rounded px-2 py-1.5 text-slate-700 hover:bg-slate-100"}>Share on LinkedIn</a>
              </div>
            </details>
          </div>
        </div>
      ) : null}
    </article>
  );
}
