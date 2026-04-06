"use client";

import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { Signal } from "@/lib/aggregator/types";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import {
  Filter,
  ShieldAlert,
  Target,
  Clock,
  Lock,
} from "lucide-react";
import {
  signalUsesSingleBodyBlock,
} from "@/lib/signals/signal-body-display";
import { markdownToPlainText, normalizeSignalBodyText } from "@/lib/signals/signal-enrichment";
import { resolveSignalSourceUrl } from "@/lib/signals/signal-source-url";
import { cn } from "@/lib/utils";
import { useSignalsColorMode } from "@/components/kindjoe-signals/signals-color-mode";
import {
  SignalRichText,
  signalFeedHeadlinePlain,
  stripHttpUrlsFromNormalizedBody,
} from "@/components/kindjoe-signals/signal-rich-text";
import { SignalSourceIdentity } from "@/components/kindjoe-signals/signal-source-identity";
import {
  getImpactSeverity,
  impactTierAccentTextClass,
  impactTierBarSegmentClass,
  impactTierBorderLeftClass,
  impactTierFreshTimeClass,
  impactTierScoreTextClass,
  impactTierSelectedCardClass,
} from "@/lib/signals/impact-tier";

function signalNavigationHref(signal: Signal): string | null {
  return resolveSignalSourceUrl(signal.source, signal.sourceUrl);
}

/** Plain text for comparing headline vs summary (URLs stripped, like feed body). */
function feedPlainComparable(raw: string): string {
  const n = normalizeSignalBodyText(raw);
  const stripped = stripHttpUrlsFromNormalizedBody(n);
  return markdownToPlainText(stripped).replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * One visible body block: same string, or summary continues where a truncated headline left off.
 * Avoids bold title + faint duplicate paragraph (common for wire/article ingests).
 */
function signalFeedUsesOneBodyBlock(
  signal: Pick<Signal, "headline" | "summary">,
): boolean {
  if (signalUsesSingleBodyBlock(signal)) return true;
  const hRaw = feedPlainComparable(signal.headline);
  const sRaw = feedPlainComparable(signal.summary);
  if (!hRaw && !sRaw) return true;
  if (hRaw === sRaw) return true;
  if (hRaw.length > 0 && sRaw.startsWith(hRaw)) return true;
  const hTrim = hRaw.replace(/[\u2026.…]+$/u, "").trimEnd();
  if (hTrim.length >= 16 && sRaw.startsWith(hTrim)) return true;
  return false;
}

function openSignalSourceOrSelect(
  signal: Signal,
  onSignalClick: (s: Signal) => void,
) {
  const href = signalNavigationHref(signal);
  if (href) {
    window.open(href, "_blank", "noopener,noreferrer");
    return;
  }
  onSignalClick(signal);
}

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|avif)(\?|$)/i;
const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v)(\?|$)/i;

function isVideoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return VIDEO_EXT_RE.test(lower) || lower.includes("video.twimg.com/");
}

/** Twitter/HLS-style URLs usually fail in a plain HTML5 video element. */
const NATIVE_VIDEO_EXT_RE = /\.(mp4|webm|ogg)(\?|$)/i;

function isLikelyNativePlayableVideoUrl(url: string): boolean {
  return NATIVE_VIDEO_EXT_RE.test(url.toLowerCase());
}

function twitterImageSortKey(url: string): number {
  const u = url.toLowerCase();
  if (u.includes("pbs.twimg.com/media")) return 4;
  if (u.includes("amplify_video_thumb")) return 3;
  if (u.includes("twimg.com/media")) return 2;
  if (isImageUrl(u)) return 1;
  return 0;
}

function isImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    IMAGE_EXT_RE.test(lower) ||
    lower.includes("pbs.twimg.com/media/") ||
    lower.includes("pbs.twimg.com/amplify_video_thumb/")
  );
}

function markVideoHasRenderableFrame(video: HTMLVideoElement): boolean {
  return video.videoWidth > 0 && video.videoHeight > 0;
}

function SignalMediaPreview({
  signal,
  isSelected,
  isLight,
}: {
  signal: Signal;
  isSelected: boolean;
  isLight: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    setImageFailed(false);
    setVideoFailed(false);
    setVideoReady(false);
  }, [signal.id]);

  const media = Array.isArray(signal.mediaUrls)
    ? signal.mediaUrls.filter((u): u is string => typeof u === "string" && u.length > 0)
    : [];

  const sorted =
    media.length > 0
      ? [...media].sort((a, b) => twitterImageSortKey(b) - twitterImageSortKey(a))
      : [];
  const imageSrc =
    sorted.length > 0
      ? (sorted.find(
          (u) => isImageUrl(u) && !isLikelyNativePlayableVideoUrl(u),
        ) ?? null)
      : null;

  const videoLike = media.filter(isVideoUrl);
  const nativeVideoSrc =
    videoLike.find((u) => isLikelyNativePlayableVideoUrl(u)) ?? null;

  useEffect(() => {
    if (!nativeVideoSrc || videoReady || videoFailed) return;
    const t = setTimeout(() => setVideoFailed(true), 8000);
    return () => clearTimeout(t);
  }, [nativeVideoSrc, signal.id, videoReady, videoFailed]);

  if (media.length === 0) return null;

  const wrapClass = cn(
    "mb-3 overflow-hidden rounded-md border",
    isLight ? "border-slate-300 bg-slate-100" : "border-white/10 bg-black/20",
  );
  const frameClass = cn(
    "w-full object-cover",
    isSelected ? "max-h-72" : "h-36",
  );

  const onVideoMaybeOk = (e: SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (markVideoHasRenderableFrame(v)) {
      setVideoReady(true);
    }
  };

  const showVideoPlayer = Boolean(nativeVideoSrc && !videoFailed);
  const showImageOnly =
    Boolean(imageSrc && !imageFailed) &&
    (!nativeVideoSrc || videoFailed);

  if (showVideoPlayer) {
    // No poster: hide the player chrome until we know the stream decodes (avoids empty grey box).
    const probeOnly = !videoReady && !imageSrc;
    return (
      <div
        className={cn(
          wrapClass,
          probeOnly &&
            "mb-0 max-h-0 min-h-0 overflow-hidden border-0 bg-transparent p-0 opacity-0",
        )}
        aria-hidden={probeOnly}
      >
        <video
          src={nativeVideoSrc!}
          poster={imageSrc ?? undefined}
          className={cn(
            frameClass,
            probeOnly && "pointer-events-none max-h-0 min-h-0",
          )}
          controls={videoReady}
          playsInline
          preload="auto"
          onError={() => setVideoFailed(true)}
          onLoadedMetadata={onVideoMaybeOk}
          onLoadedData={onVideoMaybeOk}
          onCanPlay={onVideoMaybeOk}
        />
      </div>
    );
  }

  const onlyNonPlayableVideo =
    videoLike.length > 0 &&
    videoLike.every((u) => !isLikelyNativePlayableVideoUrl(u));

  if (onlyNonPlayableVideo && !showImageOnly) {
    return null;
  }

  if (!showImageOnly) {
    return null;
  }

  return (
    <div className={wrapClass}>
      {/* eslint-disable-next-line @next/next/no-img-element -- remote social media URLs */}
      <img
        src={imageSrc!}
        alt=""
        className={frameClass}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
      />
    </div>
  );
}

function PrioritySpotlightCard({
  signal,
  isLight,
  onSignalClick,
  visibilityClass,
}: {
  signal: Signal;
  isLight: boolean;
  onSignalClick: (s: Signal) => void;
  /** e.g. `hidden md:block` (desktop only) or `md:hidden` (mobile, inside scroll). */
  visibilityClass: string;
}) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      onClick={() => openSignalSourceOrSelect(signal, onSignalClick)}
      className={cn(
        "group relative shrink-0 cursor-pointer overflow-hidden border-b p-4 transition-all",
        visibilityClass,
        isLight
          ? "border-red-200 bg-red-50 hover:bg-red-100/90"
          : "border-red-500/40 bg-red-500/10 hover:bg-red-500/20",
      )}
    >
      <div className="absolute bottom-0 left-0 top-0 w-1 bg-red-500 animate-pulse" />

      <div className="mb-2 flex items-center gap-2">
        <ShieldAlert size={14} className="animate-pulse text-red-500" />
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-red-500">
          Priority Asset
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-1 text-[8px] font-bold",
              isLight ? "text-red-800/80" : "text-red-500/60",
            )}
          >
            <Clock size={10} />
            LIVE_WINDOW
          </div>
        </div>
      </div>

      <div className="mb-3">
        <SignalSourceIdentity signal={signal} isLight={isLight} compact />
      </div>

      {signalFeedUsesOneBodyBlock(signal) ? (
        <div
          className={cn(
            "mb-3 max-h-72 overflow-y-auto pr-1 text-[12px] font-normal leading-relaxed",
            isLight ? "text-red-950/90" : "text-red-100/90",
          )}
        >
          <SignalRichText
            text={signal.summary}
            isLight={isLight}
            omitHttpUrls
          />
        </div>
      ) : (
        <>
          <h3
            className={cn(
              "mb-2 font-sans text-[13px] font-semibold normal-case not-italic leading-snug tracking-tight",
              isLight ? "text-slate-900" : "text-white",
            )}
          >
            {signalFeedHeadlinePlain(signal.headline)}
          </h3>

          <div
            className={cn(
              "mb-3 max-h-56 overflow-y-auto pr-1 text-[12px] font-normal leading-relaxed",
              isLight ? "text-red-950/85" : "text-red-200/85",
            )}
          >
            <SignalRichText
              text={signal.summary}
              isLight={isLight}
              omitHttpUrls
            />
          </div>
        </>
      )}
      <SignalMediaPreview signal={signal} isSelected={true} isLight={isLight} />

      <div
        className={cn(
          "flex items-center justify-between text-[9px] font-bold uppercase tracking-widest",
          isLight ? "text-red-900/90" : "text-red-400/70",
        )}
      >
        <span>Sector: {signal.category}</span>
        <span className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 text-[7px] font-black tracking-wider",
              isLight
                ? "border-red-200 bg-red-100 text-red-900"
                : "border-red-500/35 bg-red-950/50 text-red-200",
            )}
          >
            IMPACT {signal.impactScore}
          </span>
          <span className="flex gap-1">
            <span className="animate-ping text-red-500">●</span> HOT
          </span>
        </span>
      </div>
    </motion.div>
  );
}

interface FeedProps {
  signals: Signal[];
  /** Live HOT row — computed by parent so globe can match the same signal. */
  spotlightSignal: Signal | null;
  onSignalClick: (signal: Signal) => void;
  selectedSignal: Signal | null;
  onOpenFilters: () => void;
  /** Total signals before client-side filters (for empty-state hint). */
  totalUnfilteredCount?: number;
  onClearFilters?: () => void;
  /** When false, sidebar shows unlock CTA instead of the headline list. */
  sidebarAccessUnlocked?: boolean;
  /** True while cookie check runs (avoid CTA flash for returning users). */
  accessCheckPending?: boolean;
  onOpenUnlockModal?: () => void;
}

export default function Feed({
  signals,
  spotlightSignal,
  onSignalClick,
  selectedSignal,
  onOpenFilters,
  totalUnfilteredCount,
  onClearFilters,
  sidebarAccessUnlocked = true,
  accessCheckPending = false,
  onOpenUnlockModal,
}: FeedProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const mainFeedSignals = useMemo(() => {
    const sorted = [...signals].sort((a, b) => b.timestamp - a.timestamp);

    if (!spotlightSignal) return sorted;
    return sorted.filter((s) => s.id !== spotlightSignal.id);
  }, [signals, spotlightSignal]);

  const showUnlockPanel = !sidebarAccessUnlocked;

  const { mode } = useSignalsColorMode();
  const isLight = mode === "light";

  return (
    <div
      className={cn(
        "z-10 flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-t font-sans md:w-80 lg:w-96 md:border-l md:border-t-0 md:flex-none md:h-auto flex-1",
        isLight
          ? "border-slate-300 bg-white"
          : "border-white/10 bg-[#0A0A0F]",
      )}
    >
      <div
        className={cn(
          "z-20 flex shrink-0 items-center justify-between border-b p-4 backdrop-blur-md md:sticky md:top-0",
          isLight
            ? "border-slate-200 bg-slate-50"
            : "border-white/10 bg-black/50",
        )}
      >
        <h2 className="sr-only">Signal feed</h2>
        <button
          type="button"
          onClick={onOpenFilters}
          className={cn(
            "flex items-center gap-1.5 rounded border px-2 py-1 text-[9px] uppercase tracking-widest transition-colors",
            isLight
              ? "border-slate-300 bg-white text-slate-900 shadow-sm hover:border-slate-400 hover:bg-slate-50"
              : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white",
          )}
        >
          <Filter size={10} /> Filters
        </button>
      </div>

      {/* Desktop: priority stays above the scroll list */}
      <AnimatePresence mode="wait">
        {spotlightSignal ? (
          <PrioritySpotlightCard
            key={spotlightSignal.id}
            signal={spotlightSignal}
            isLight={isLight}
            onSignalClick={onSignalClick}
            visibilityClass="hidden shrink-0 md:block"
          />
        ) : null}
      </AnimatePresence>

      <div
        className={cn(
          "min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain p-2 [-webkit-overflow-scrolling:touch] scrollbar-thin scrollbar-track-transparent",
          isLight
            ? "scrollbar-thumb-slate-300"
            : "scrollbar-thumb-white/10",
        )}
      >
        {/* Mobile: priority scrolls with the feed */}
        <AnimatePresence mode="wait">
          {spotlightSignal ? (
            <PrioritySpotlightCard
              key={`m-${spotlightSignal.id}`}
              signal={spotlightSignal}
              isLight={isLight}
              onSignalClick={onSignalClick}
              visibilityClass="md:hidden"
            />
          ) : null}
        </AnimatePresence>

        {showUnlockPanel ? (
          <div
            className={cn(
              "flex min-h-[180px] flex-col items-center justify-center rounded-md border p-5 text-center md:min-h-[240px]",
              isLight
                ? "border-sky-300 bg-sky-50/80"
                : "rounded-sm border-[#00BFFF]/20 bg-[#00BFFF]/5",
            )}
          >
            {accessCheckPending ? (
              <>
                <div className="relative mb-4 flex h-7 w-7">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00BFFF] opacity-50" />
                  <span className="relative inline-flex h-7 w-7 rounded-full bg-[#00BFFF]" />
                </div>
                <p
                  className={cn(
                    "text-[11px] font-medium",
                    isLight ? "text-slate-800" : "text-gray-300",
                  )}
                >
                  Checking access…
                </p>
              </>
            ) : (
              <>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-[#00BFFF]/35 bg-[#00BFFF]/10">
                  <Lock className="h-5 w-5 text-[#00BFFF]" aria-hidden />
                </div>
                <p
                  className={cn(
                    "max-w-[220px] text-[11px] font-semibold leading-snug",
                    isLight ? "text-slate-900" : "text-white",
                  )}
                >
                  Sign in to view the full feed.
                </p>
                {onOpenUnlockModal ? (
                  <button
                    type="button"
                    onClick={onOpenUnlockModal}
                    className="mt-5 w-full rounded-md bg-[#00BFFF] py-2.5 text-[10px] font-bold uppercase tracking-wider text-black shadow-[0_0_20px_rgba(0,191,255,0.25)] transition-colors hover:bg-[#00BFFF]/90"
                  >
                    Sign in
                  </button>
                ) : null}
              </>
            )}
          </div>
        ) : (
          <>
            {mainFeedSignals.length === 0 &&
              totalUnfilteredCount !== undefined &&
              totalUnfilteredCount > 0 && (
                <div
                  className={cn(
                    "rounded-sm border border-amber-500/25 p-4 text-center",
                    isLight ? "bg-amber-50" : "bg-amber-950/20",
                  )}
                >
                  <p
                    className={cn(
                      "text-[11px] font-medium",
                      isLight ? "text-amber-950" : "text-amber-100/90",
                    )}
                  >
                    No signals match your filters or search.
                  </p>
                  {onClearFilters && (
                    <button
                      type="button"
                      onClick={onClearFilters}
                      className="mt-3 text-[10px] font-bold uppercase tracking-widest text-[#00BFFF] underline-offset-2 hover:underline"
                    >
                      Reset filters
                    </button>
                  )}
                </div>
              )}
            <AnimatePresence initial={false}>
              {mainFeedSignals.map((signal) => {
                const isSelected = selectedSignal?.id === signal.id;
                const timeDiff = now - signal.timestamp;
                const tier = getImpactSeverity(signal.impactScore);
                const timeLabel =
                  timeDiff < 60000 || signal.timestamp > now
                    ? "just now"
                    : formatDistanceToNow(signal.timestamp, { addSuffix: true })
                        .replace("about ", "")
                        .replace("less than a minute ago", "just now");

                return (
                  <motion.div
                    key={signal.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => openSignalSourceOrSelect(signal, onSignalClick)}
                    className={cn(
                      "group cursor-pointer rounded-sm border border-l-2 p-4 transition-all duration-300",
                      impactTierBorderLeftClass(tier),
                      isSelected
                        ? impactTierSelectedCardClass(tier, isLight)
                        : isLight
                          ? "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white"
                          : "border-white/5 bg-white/[0.01] hover:border-white/15",
                    )}
                  >
                    <div className="mb-2">
                      <SignalSourceIdentity
                        signal={signal}
                        isLight={isLight}
                      />
                    </div>

                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-widest",
                          timeDiff < 120000
                            ? impactTierFreshTimeClass(tier, isLight)
                            : isLight
                              ? "text-slate-700"
                              : "text-gray-600",
                        )}
                      >
                        {timeLabel}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {isSelected && (
                          <div
                            className={cn(
                              "flex items-center gap-1",
                              impactTierAccentTextClass(tier, isLight),
                            )}
                          >
                            <Target size={10} className="shrink-0" />
                            <span className="text-[8px] font-bold uppercase">
                              Locked
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {signalFeedUsesOneBodyBlock(signal) ? (
                      <div
                        className={cn(
                          "mb-3 text-[12px] font-normal leading-relaxed",
                          "max-h-72 overflow-y-auto pr-1",
                          isLight ? "text-slate-800" : "text-gray-300",
                        )}
                      >
                        <SignalRichText
                          text={signal.summary}
                          isLight={isLight}
                          compact={false}
                          omitHttpUrls
                        />
                      </div>
                    ) : (
                      <>
                        <h3
                          className={cn(
                            "mb-2 font-sans text-[12px] font-semibold normal-case leading-snug tracking-tight transition-colors",
                            isLight
                              ? "text-slate-950 group-hover:text-slate-950"
                              : "text-gray-200 group-hover:text-white",
                          )}
                        >
                          {signalFeedHeadlinePlain(signal.headline)}
                        </h3>

                        <div
                          className={cn(
                            "mb-3 text-[12px] font-normal leading-relaxed",
                            "max-h-72 overflow-y-auto pr-1",
                            isLight ? "text-slate-700" : "text-gray-400",
                          )}
                        >
                          <SignalRichText
                            text={signal.summary}
                            isLight={isLight}
                            compact={false}
                            omitHttpUrls
                          />
                        </div>
                      </>
                    )}
                    <SignalMediaPreview
                      signal={signal}
                      isSelected={isSelected}
                      isLight={isLight}
                    />

                    <div
                      className={cn(
                        "flex items-center justify-between border-t pt-3 text-[8px] tracking-widest",
                        isLight ? "border-slate-300" : "border-white/5",
                      )}
                    >
        <span
          className={cn(
            "rounded border px-1.5 py-px text-[7px] font-black uppercase tracking-[0.16em]",
            isLight
              ? "border-slate-300 bg-slate-100 text-slate-700"
              : "border-white/12 bg-white/[0.04] text-slate-300",
          )}
        >
          {signal.category}
        </span>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className={cn(
                                "h-1.5 w-0.5 rounded-full",
                                i <= signal.impactScore / 20
                                  ? impactTierBarSegmentClass(tier)
                                  : isLight
                                    ? "bg-slate-200"
                                    : "bg-white/5",
                              )}
                            />
                          ))}
                        </div>
                        <span
                          className={cn(
                            "font-bold tabular-nums",
                            impactTierScoreTextClass(tier, isLight),
                          )}
                        >
                          {signal.impactScore}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
