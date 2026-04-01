"use client";

import { useEffect, useMemo, useState } from "react";
import { Signal } from "@/lib/aggregator/types";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import {
  Filter,
  ShieldAlert,
  Target,
  Clock,
  Lock,
  ExternalLink,
} from "lucide-react";
import { signalUsesSingleBodyBlock } from "@/lib/signals/signal-body-display";
import {
  isXOrTwitterStoryHref,
  resolveSignalSourceUrl,
  signalOutboundLinkLabel,
} from "@/lib/signals/signal-source-url";
import { cn } from "@/lib/utils";
import { useSignalsColorMode } from "@/components/kindjoe-signals/signals-color-mode";
import {
  getImpactSeverity,
  impactTierAccentTextClass,
  impactTierBadgeClass,
  impactTierBarSegmentClass,
  impactTierBorderLeftClass,
  impactTierFreshTimeClass,
  impactTierLabel,
  impactTierScoreTextClass,
  impactTierSelectedCardClass,
  impactTierTag,
} from "@/lib/signals/impact-tier";

function SignalSourceLink({
  signal,
  isLight,
  variant,
}: {
  signal: Signal;
  isLight: boolean;
  variant: "spotlight" | "row";
}) {
  const href = resolveSignalSourceUrl(signal.source, signal.sourceUrl);
  if (!href) return null;

  const label = signalOutboundLinkLabel(
    href,
    signal.source,
    variant === "spotlight" ? 52 : 48,
  );
  const isX = isXOrTwitterStoryHref(href);

  const shellClass = cn(
    "inline-flex min-w-0 items-center gap-1 rounded border px-1.5 py-0.5",
    variant === "spotlight"
      ? "max-w-[min(100%,13rem)]"
      : "max-w-[12rem] sm:max-w-[16rem]",
    variant === "spotlight"
      ? isLight
        ? "border-red-200/90 bg-red-50/90 text-red-900"
        : "border-red-500/35 bg-red-950/50 text-red-200/95"
      : isLight
        ? "border-slate-300 bg-white text-slate-800"
        : "border-white/15 bg-white/[0.04] text-gray-400",
    variant === "spotlight"
      ? isLight
        ? "cursor-pointer transition-colors hover:border-red-400 hover:bg-red-100"
        : "cursor-pointer transition-colors hover:border-red-400/50 hover:bg-red-500/15"
      : isLight
        ? "cursor-pointer transition-colors hover:border-[#00BFFF] hover:bg-sky-50 hover:text-slate-900"
        : "cursor-pointer transition-colors hover:border-[#00BFFF]/40 hover:bg-[#00BFFF]/10 hover:text-white",
  );

  const textClass = cn(
    "pointer-events-none min-w-0 truncate text-[8px] leading-tight",
    isX
      ? cn(
          "font-black uppercase tracking-wider underline-offset-2 group-hover:underline",
          variant === "spotlight"
            ? isLight
              ? "text-red-950/90"
              : "text-red-100/95"
            : isLight
              ? "text-slate-800"
              : "text-gray-200",
        )
      : cn(
          "font-mono font-bold tracking-tight underline-offset-2 group-hover:underline",
          variant === "spotlight"
            ? isLight
              ? "text-red-950/90"
              : "text-red-100/95"
            : isLight
              ? "text-slate-800"
              : "text-gray-200",
        ),
  );

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        shellClass,
        "group relative z-20 cursor-pointer pointer-events-auto select-text",
      )}
      title={href}
      aria-label={`Open source: ${href}`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <ExternalLink className="pointer-events-none h-3 w-3 shrink-0 opacity-90" strokeWidth={2.5} />
      <span className={textClass}>{label}</span>
    </a>
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
      onClick={() => onSignalClick(signal)}
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
          <SignalSourceLink
            signal={signal}
            isLight={isLight}
            variant="spotlight"
          />
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

      {signalUsesSingleBodyBlock(signal) ? (
        <p
          className={cn(
            "mb-3 line-clamp-5 whitespace-pre-wrap break-words text-[11px] font-medium leading-relaxed",
            isLight ? "text-red-950/90" : "text-red-100/90",
          )}
        >
          {signal.summary}
        </p>
      ) : (
        <>
          <h3
            className={cn(
              "mb-2 text-[13px] font-bold uppercase italic leading-tight tracking-tighter",
              isLight ? "text-slate-900" : "text-white",
            )}
          >
            {signal.headline}
          </h3>

          <p
            className={cn(
              "mb-3 line-clamp-5 whitespace-pre-wrap break-words text-[10px] leading-relaxed",
              isLight ? "text-red-950/85" : "text-red-200/80",
            )}
          >
            {signal.summary}
          </p>
        </>
      )}

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
            {impactTierLabel(getImpactSeverity(signal.impactScore))}
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
        "z-10 flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-t font-mono md:w-80 lg:w-96 md:border-l md:border-t-0 md:flex-none md:h-auto flex-1",
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
                  Enter your info to access KindJoe signals.
                </p>
                {onOpenUnlockModal ? (
                  <button
                    type="button"
                    onClick={onOpenUnlockModal}
                    className="mt-5 w-full rounded-md bg-[#00BFFF] py-2.5 text-[10px] font-bold uppercase tracking-wider text-black shadow-[0_0_20px_rgba(0,191,255,0.25)] transition-colors hover:bg-[#00BFFF]/90"
                  >
                    Enter your info
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
                    onClick={() => onSignalClick(signal)}
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
                      <div className="flex shrink-0 items-center gap-2">
                        <SignalSourceLink
                          signal={signal}
                          isLight={isLight}
                          variant="row"
                        />
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

                    {signalUsesSingleBodyBlock(signal) ? (
                      <p
                        className={cn(
                          "mb-3 text-[11px] font-medium leading-relaxed whitespace-pre-wrap break-words",
                          isSelected
                            ? "max-h-56 overflow-y-auto pr-1"
                            : "line-clamp-2",
                          isLight ? "text-slate-800" : "text-gray-300",
                        )}
                      >
                        {signal.summary}
                      </p>
                    ) : (
                      <>
                        <h3
                          className={cn(
                            "mb-2 text-[12px] font-bold uppercase leading-snug tracking-tight transition-colors",
                            isLight
                              ? "text-slate-950 group-hover:text-slate-950"
                              : "text-gray-200 group-hover:text-white",
                          )}
                        >
                          {signal.headline}
                        </h3>

                        <p
                          className={cn(
                            "mb-3 text-[10px] font-medium leading-relaxed whitespace-pre-wrap break-words",
                            isSelected
                              ? "max-h-56 overflow-y-auto pr-1"
                              : "line-clamp-2",
                            isLight ? "text-slate-700" : "text-gray-500",
                          )}
                        >
                          {signal.summary}
                        </p>
                      </>
                    )}

                    <div
                      className={cn(
                        "flex items-center justify-between border-t pt-3 text-[8px] tracking-widest",
                        isLight ? "border-slate-300" : "border-white/5",
                      )}
                    >
                      <span
                        className={cn(
                          "font-black uppercase",
                          isLight ? "text-slate-800" : "text-gray-600",
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
                            "rounded border px-1.5 py-px text-[7px] font-black tracking-wider",
                            impactTierBadgeClass(tier, isLight),
                          )}
                        >
                          {impactTierTag(tier)}
                        </span>
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
