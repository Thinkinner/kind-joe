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

  return (
    <div className="w-full md:w-80 lg:w-96 bg-[#0A0A0F] border-t md:border-t-0 md:border-l border-white/10 flex flex-col shrink-0 z-10 overflow-hidden flex-1 md:flex-none md:h-auto font-mono">
      <div className="p-4 border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
        <h2 className="text-[10px] text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2 font-bold">
          <Activity size={12} className="text-[#00BFFF]" />
          <span>Intel_Stream</span>
        </h2>
        <button
          type="button"
          onClick={onOpenFilters}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-[9px] border border-white/10 uppercase tracking-widest"
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

            <h3 className="text-[13px] font-bold text-white leading-tight mb-2 uppercase italic tracking-tighter">
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

      <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {showUnlockPanel ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center rounded-sm border border-[#00BFFF]/20 bg-[#00BFFF]/5 p-5 text-center md:min-h-[240px]">
            {accessCheckPending ? (
              <>
                <div className="relative mb-4 flex h-7 w-7">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00BFFF] opacity-50" />
                  <span className="relative inline-flex h-7 w-7 rounded-full bg-[#00BFFF]" />
                </div>
                <p className="text-[11px] font-medium text-gray-300">
                  Checking access…
                </p>
              </>
            ) : (
              <>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-[#00BFFF]/35 bg-[#00BFFF]/10">
                  <Lock className="h-5 w-5 text-[#00BFFF]" aria-hidden />
                </div>
                <p className="text-[11px] font-semibold text-white">
                  Live map is on — unlock the feed
                </p>
                <p className="mt-2 text-[10px] leading-relaxed text-gray-500">
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
                <div className="rounded-sm border border-amber-500/25 bg-amber-950/20 p-4 text-center">
                  <p className="text-[11px] font-medium text-amber-100/90">
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
                    className={`p-4 rounded-sm border cursor-pointer transition-all duration-300 group ${isSelected ? "bg-gray-900 border-[#00BFFF] shadow-[0_0_15px_rgba(0,191,255,0.1)]" : "bg-white/[0.01] border-white/5 hover:border-white/15"}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-[9px] uppercase tracking-widest font-bold ${timeDiff < 120000 ? "text-[#00BFFF]" : "text-gray-600"}`}
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

                    <h3 className="text-[12px] font-bold text-gray-200 mb-2 leading-snug group-hover:text-white transition-colors tracking-tight uppercase">
                      {signal.headline}
                    </h3>

                    <p className="text-[10px] text-gray-500 line-clamp-2 mb-3 leading-relaxed font-medium">
                      {signal.summary}
                    </p>

                    <div className="flex items-center justify-between text-[8px] border-t border-white/5 pt-3 tracking-widest">
                      <span className="text-gray-600 uppercase font-black">
                        {signal.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className={`w-0.5 h-1.5 rounded-full ${i <= signal.impactScore / 20 ? "bg-[#00BFFF]" : "bg-white/5"}`}
                            />
                          ))}
                        </div>
                        <span className="text-gray-400 font-bold">
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
