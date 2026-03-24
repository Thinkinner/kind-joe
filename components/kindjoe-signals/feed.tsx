"use client";

import { useState, useEffect } from "react";
import { Signal } from "@/lib/aggregator/types";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { Twitter, MessageSquare, Hash, Filter } from "lucide-react";

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
  // RSS: Rss, // Commented out
};

export default function Feed({
  signals,
  onSignalClick,
  selectedSignal,
  onOpenFilters,
}: FeedProps) {
  // Force re-render every 30 seconds so timestamps actively "tick" upward
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

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
            const Icon = SOURCE_ICONS[signal.source as keyof typeof SOURCE_ICONS];
            const colorClass = SOURCE_COLORS[signal.source as keyof typeof SOURCE_COLORS];
            const isSelected = selectedSignal?.id === signal.id;

            // --- TIME AND FRESHNESS CALCULATION ---
            const now = Date.now();
            const timeDiff = now - signal.timestamp;

            let timeLabel = "";
            // If less than 60 seconds old or somehow in the future, show "just now"
            if (timeDiff < 60000 || signal.timestamp > now) {
              timeLabel = "just now";
            } else {
              // Otherwise, format normally (e.g. "1 minute ago")
              timeLabel = formatDistanceToNow(signal.timestamp, { addSuffix: true })
                .replace("about ", "")
                .replace("less than a minute ago", "just now");
            }

            return (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                onClick={() => onSignalClick(signal)}
                className={`p-3 rounded-lg border cursor-pointer transition-all duration-300 group ${
                  isSelected
                    ? "bg-gray-900 border-[#00BFFF] shadow-[0_0_20px_rgba(0,191,255,0.15)]"
                    : "bg-black/40 border-gray-800/50 hover:bg-gray-900/60 hover:border-gray-700"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {/* Hide the source text and icon completely if it is RSS */}
                    {signal.source !== "RSS" && (
                      <>
                        {Icon && <Icon size={14} className={colorClass} />}
                        <span
                          className={`text-[10px] font-mono font-bold uppercase tracking-tight ${colorClass}`}
                        >
                          {signal.source}
                        </span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-gray-500">
                    {timeLabel}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-gray-200 mb-1 leading-tight group-hover:text-white transition-colors">
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