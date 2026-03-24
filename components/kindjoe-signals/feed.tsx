"use client";

import { Signal } from "@/lib/aggregator/types";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { Twitter, MessageSquare, Rss, Hash, Filter, Zap } from "lucide-react";

interface FeedProps {
  signals: Signal[];
  onSignalClick: (signal: Signal) => void;
  selectedSignal: Signal | null;
  onOpenFilters: () => void;
}

const SOURCE_COLORS = {
  X: "text-[#00BFFF]",
  Telegram: "text-[#8A2BE2]",
  Discord: "text-[#FF69B4]",
  RSS: "text-[#FFA500]",
};

const SOURCE_ICONS = {
  X: Twitter,
  Telegram: MessageSquare,
  Discord: Hash,
  RSS: Rss,
};

export default function Feed({
  signals,
  onSignalClick,
  selectedSignal,
  onOpenFilters,
}: FeedProps) {
  return (
    <div className="w-full md:w-80 lg:w-96 bg-[#0A0A0F] border-t md:border-t-0 md:border-l border-gray-800 flex flex-col shrink-0 z-10 overflow-hidden flex-1 md:flex-none md:h-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-black/50 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
        <h2 className="text-xs font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <span>Live Signal Feed</span>
          <span className="text-[#00BFFF] animate-pulse">● REC</span>
        </h2>
        <button
          onClick={onOpenFilters}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white transition-colors text-xs font-mono border border-gray-700/50"
        >
          <Filter size={12} />
          Filters
        </button>
      </div>

      {/* Signals List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {signals.map((signal) => {
            const Icon = SOURCE_ICONS[signal.source];
            const colorClass = SOURCE_COLORS[signal.source];
            const isSelected = selectedSignal?.id === signal.id;

            // --- FRESHNESS CHECK ---
            // If the signal is less than 5 minutes old, we highlight it
            const isFresh = Date.now() - signal.timestamp < 5 * 60 * 1000;

            return (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                onClick={() => onSignalClick(signal)}
                className={`p-3 rounded-lg border cursor-pointer transition-all duration-300 group relative overflow-hidden ${
                  isSelected
                    ? "bg-gray-900 border-[#00BFFF] shadow-[0_0_20px_rgba(0,191,255,0.15)]"
                    : isFresh
                      ? "bg-[#00BFFF]/5 border-[#00BFFF]/30 shadow-[0_0_10px_rgba(0,191,255,0.05)]"
                      : "bg-black/40 border-gray-800/50 hover:bg-gray-900/60 hover:border-gray-700"
                }`}
              >
                {/* Visual Freshness Indicator (Side Bar) */}
                {isFresh && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00BFFF] animate-pulse" />
                )}

                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={colorClass} />
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-tight ${colorClass}`}
                    >
                      {signal.source}
                    </span>
                    {isFresh && (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-[#00BFFF] bg-[#00BFFF]/10 px-1.5 py-0.5 rounded border border-[#00BFFF]/20 animate-pulse">
                        <Zap size={10} fill="currentColor" />
                        NEW
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-mono ${isFresh ? "text-[#00BFFF] font-bold" : "text-gray-500"}`}
                  >
                    {formatDistanceToNow(signal.timestamp, {
                      addSuffix: true,
                    }).replace("about ", "")}
                  </span>
                </div>

                <h3
                  className={`text-sm font-bold mb-1 leading-tight transition-colors ${
                    isFresh
                      ? "text-white"
                      : "text-gray-200 group-hover:text-white"
                  }`}
                >
                  {signal.headline}
                </h3>

                <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                  {signal.summary}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {signal.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] font-mono text-[#00BFFF]/80 bg-[#00BFFF]/5 px-1.5 py-0.5 rounded border border-[#00BFFF]/10"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-gray-800/50 text-gray-400 border border-gray-700/50 text-[9px] uppercase tracking-wider">
                    {signal.category}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-600 text-[9px] uppercase font-bold">
                      Impact
                    </span>
                    <span
                      className={`font-bold ${
                        signal.impactScore > 80
                          ? "text-[#FF4500]"
                          : signal.impactScore > 50
                            ? "text-yellow-500"
                            : "text-green-500"
                      }`}
                    >
                      {signal.impactScore}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
