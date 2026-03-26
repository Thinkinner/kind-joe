"use client";

import { useState, useEffect, useMemo } from "react";
import { Signal } from "@/lib/aggregator/types";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import {
  Filter,
  ShieldAlert,
  Target,
  Activity,
  Clock,
  Lock,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSignalsColorMode } from "@/components/kindjoe-signals/signals-color-mode";

interface FeedProps {
  signals: Signal[];
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
  /** Matches what the globe is showing (usually filtered count). */
  mapSignalCount?: number;
}

export default function Feed({
  signals,
  onSignalClick,
  selectedSignal,
  onOpenFilters,
  totalUnfilteredCount,
  onClearFilters,
  sidebarAccessUnlocked = true,
  accessCheckPending = false,
  onOpenUnlockModal,
  mapSignalCount = 0,
}: FeedProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const spotlightSignal = useMemo(() => {
    if (!sidebarAccessUnlocked || signals.length === 0) return null;
    const TWO_MINUTES = 2 * 60 * 1000;

    const hotSignals = signals.filter((s) => now - s.timestamp < TWO_MINUTES);

    if (hotSignals.length === 0) return null;

    const highestImpactHotSignal = hotSignals.reduce((prev, current) =>
      prev.impactScore > current.impactScore ? prev : current,
    );

    return highestImpactHotSignal.impactScore >= 60
      ? highestImpactHotSignal
      : null;
  }, [signals, now, sidebarAccessUnlocked]);

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
        "z-10 flex w-full shrink-0 flex-col overflow-hidden border-t font-mono md:w-80 lg:w-96 md:border-l md:border-t-0 md:flex-none md:h-auto flex-1",
        isLight
          ? "border-slate-200 bg-slate-50"
          : "border-white/10 bg-[#0A0A0F]",
      )}
    >
      <div
        className={cn(
          "sticky top-0 z-20 flex items-center justify-between border-b p-4 backdrop-blur-md",
          isLight
            ? "border-slate-200 bg-white/70"
            : "border-white/10 bg-black/50",
        )}
      >
        <h2
          className={cn(
            "flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em]",
            isLight ? "text-slate-500" : "text-gray-500",
          )}
        >
          <Activity size={12} className="text-[#00BFFF]" />
          <span>Intel_Stream</span>
        </h2>
        <button
          type="button"
          onClick={onOpenFilters}
          className={cn(
            "flex items-center gap-1.5 rounded border px-2 py-1 text-[9px] uppercase tracking-widest transition-colors",
            isLight
              ? "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white",
          )}
        >
          <Filter size={10} /> Filters
        </button>
      </div>

      <AnimatePresence mode="wait">
        {spotlightSignal && (
          <motion.div
            key={spotlightSignal.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onClick={() => onSignalClick(spotlightSignal)}
            className="bg-red-500/10 border-b border-red-500/40 p-4 cursor-pointer group hover:bg-red-500/20 transition-all relative overflow-hidden"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 animate-pulse" />

            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert size={14} className="text-red-500 animate-pulse" />
              <span className="text-[9px] font-black text-red-500 tracking-[0.2em] uppercase">
                Priority Asset
              </span>
              <div className="ml-auto flex items-center gap-1 text-[8px] text-red-500/60 font-bold">
                <Clock size={10} />
                LIVE_WINDOW
              </div>
            </div>

            <h3
              className={cn(
                "mb-2 text-[13px] font-bold uppercase italic leading-tight tracking-tighter",
                isLight ? "text-slate-900" : "text-white",
              )}
            >
              {spotlightSignal.headline}
            </h3>

            <p className="text-[10px] text-red-200/80 leading-relaxed mb-3 line-clamp-3">
              {spotlightSignal.summary}
            </p>

            <div className="flex justify-between items-center text-[9px] text-red-400/70 font-bold uppercase tracking-widest">
              <span>Sector: {spotlightSignal.category}</span>
              <span className="flex gap-1">
                <span className="animate-ping text-red-500">●</span> HOT
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "flex-1 space-y-2 overflow-y-auto p-2 scrollbar-thin scrollbar-track-transparent",
          isLight
            ? "scrollbar-thumb-slate-300"
            : "scrollbar-thumb-white/10",
        )}
      >
        {showUnlockPanel ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center rounded-sm border border-[#00BFFF]/20 bg-[#00BFFF]/5 p-5 text-center md:min-h-[240px]">
            {accessCheckPending ? (
              <>
                <div className="relative mb-4 flex h-7 w-7">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00BFFF] opacity-50" />
                  <span className="relative inline-flex h-7 w-7 rounded-full bg-[#00BFFF]" />
                </div>
                <p
                  className={cn(
                    "text-[11px] font-medium",
                    isLight ? "text-slate-600" : "text-gray-300",
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
                    "text-[11px] font-semibold",
                    isLight ? "text-slate-900" : "text-white",
                  )}
                >
                  Live map is on — unlock the feed
                </p>
                <p
                  className={cn(
                    "mt-2 text-[10px] leading-relaxed",
                    isLight ? "text-slate-600" : "text-gray-500",
                  )}
                >
                  Watch breaking signals on the globe in real time. Add your
                  email once to read full headlines and summaries in this panel.
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#00BFFF]/80">
                  <Radio className="h-3 w-3" aria-hidden />
                  <span>
                    {mapSignalCount}{" "}
                    {mapSignalCount === 1 ? "signal" : "signals"} on map
                  </span>
                </div>
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
                      "group cursor-pointer rounded-sm border p-4 transition-all duration-300",
                      isSelected
                        ? "border-[#00BFFF] shadow-[0_0_15px_rgba(0,191,255,0.1)]"
                        : isLight
                          ? "border-slate-200 bg-white hover:border-slate-300"
                          : "border-white/5 bg-white/[0.01] hover:border-white/15",
                      isSelected &&
                        (isLight ? "bg-sky-50" : "bg-gray-900"),
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-widest",
                          timeDiff < 120000
                            ? "text-[#00BFFF]"
                            : isLight
                              ? "text-slate-500"
                              : "text-gray-600",
                        )}
                      >
                        {timeLabel}
                      </span>
                      {isSelected && (
                        <div className="flex items-center gap-1">
                          <Target size={10} className="text-[#00BFFF]" />
                          <span className="text-[8px] text-[#00BFFF] uppercase font-bold">
                            Locked
                          </span>
                        </div>
                      )}
                    </div>

                    <h3
                      className={cn(
                        "mb-2 text-[12px] font-bold uppercase leading-snug tracking-tight transition-colors",
                        isLight
                          ? "text-slate-800 group-hover:text-slate-950"
                          : "text-gray-200 group-hover:text-white",
                      )}
                    >
                      {signal.headline}
                    </h3>

                    <p
                      className={cn(
                        "mb-3 line-clamp-2 text-[10px] font-medium leading-relaxed",
                        isLight ? "text-slate-600" : "text-gray-500",
                      )}
                    >
                      {signal.summary}
                    </p>

                    <div
                      className={cn(
                        "flex items-center justify-between border-t pt-3 text-[8px] tracking-widest",
                        isLight ? "border-slate-200" : "border-white/5",
                      )}
                    >
                      <span
                        className={cn(
                          "font-black uppercase",
                          isLight ? "text-slate-600" : "text-gray-600",
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
                                  ? "bg-[#00BFFF]"
                                  : isLight
                                    ? "bg-slate-200"
                                    : "bg-white/5",
                              )}
                            />
                          ))}
                        </div>
                        <span
                          className={cn(
                            "font-bold",
                            isLight ? "text-slate-500" : "text-gray-400",
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
