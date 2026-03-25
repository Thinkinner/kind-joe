"use client";

import { useMemo, useEffect, useState } from "react";
import { Category, Signal } from "@/lib/aggregator/types";
import {
  X,
  Globe,
  TrendingUp,
  Cpu,
  Flame,
  MapPin,
  Hash,
  Target,
  Zap,
  BarChart3,
  Terminal,
} from "lucide-react";

const CATEGORY_ICONS: Record<Category, any> = {
  Geopolitics: Globe,
  "Conflicts & Wars": Flame,
  "Economy & Markets": TrendingUp,
  "Tech & Science": Cpu,
  "Disasters & Emergencies": Zap,
  "Viral / Social": Target,
};

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  signals: Signal[];
  selectedCategory: Category | "All";
  setSelectedCategory: (cat: Category | "All") => void;
  selectedCountry: string | "All";
  setSelectedCountry: (country: string | "All") => void;
  selectedTag: string | "All";
  setSelectedTag: (tag: string | "All") => void;
}

export default function FilterModal({
  isOpen,
  onClose,
  signals = [],
  selectedCategory,
  setSelectedCategory,
  selectedCountry,
  setSelectedCountry,
  selectedTag,
  setSelectedTag,
}: FilterModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // --- 📊 DYNAMIC TREND & SEARCH ANALYSIS ---
  const trends = useMemo(() => {
    const stats = {
      categories: {} as Record<string, number>,
      countries: {} as Record<string, number>,
      tags: {} as Record<string, number>,
    };

    if (!signals || !Array.isArray(signals)) return null;

    // 1. Calculate global counts from all signals
    signals.forEach((s) => {
      if (!s) return;
      stats.categories[s.category] = (stats.categories[s.category] || 0) + 1;
      stats.countries[s.country] = (stats.countries[s.country] || 0) + 1;
      if (s.tags) {
        s.tags.forEach((tag) => {
          stats.tags[tag] = (stats.tags[tag] || 0) + 1;
        });
      }
    });

    const query = searchQuery.toLowerCase().trim();

    // 2. Filter based on Search Query
    return {
      activeCategories: Object.keys(CATEGORY_ICONS).filter((c) =>
        c.toLowerCase().includes(query),
      ),
      activeCountries: Object.entries(stats.countries)
        .filter(([name]) => name.toLowerCase().includes(query))
        .sort((a, b) => b[1] - a[1]), // Sort by volume (Most news first)
      trendingTags: Object.entries(stats.tags)
        .filter(([name]) => name.toLowerCase().includes(query))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30),
      counts: stats,
    };
  }, [signals, searchQuery]);

  // Handle Search Input focus
  const inputRef = (node: HTMLInputElement) => {
    if (node) node.focus();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#050508]/95 backdrop-blur-xl">
      <div className="bg-[#0A0A0F] border border-white/10 rounded-sm w-full max-w-5xl shadow-[0_0_80px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-[#00BFFF]/10 border border-[#00BFFF]/30 rounded-sm">
              <BarChart3 size={18} className="text-[#00BFFF]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-[#00BFFF] tracking-[0.3em] font-bold uppercase">
                Dynamic Filter Engine
              </span>
              <h2 className="text-sm font-mono text-white font-bold tracking-tight uppercase">
                Intel_Search_Terminal
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white border border-white/5"
          >
            <X size={20} />
          </button>
        </div>

        {/* 🔍 TACTICAL SEARCH BAR */}
        <div className="px-8 py-4 bg-white/[0.03] border-b border-white/5 flex items-center gap-4 group">
          <Terminal
            size={16}
            className="text-[#00BFFF] opacity-50 group-focus-within:opacity-100"
          />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="EXECUTE_INTEL_QUERY (COUNTRY, TAG, OR SECTOR)..."
            className="bg-transparent border-none outline-none text-white font-mono text-xs w-full tracking-[0.2em] placeholder:text-gray-700 uppercase"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-[10px] font-mono text-gray-500 hover:text-white transition-colors border border-white/10 px-2 py-1 rounded"
            >
              [CLEAR_QUERY]
            </button>
          )}
        </div>

        {/* HUD Body */}
        <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Column 1: Sectors */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                Sectors
              </span>
              <span className="text-[9px] font-mono text-[#00BFFF]/50">
                Count: {trends?.activeCategories.length}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {!searchQuery && (
                <FilterButton
                  label="ALL_SIGNALS"
                  count={signals.length}
                  isSelected={selectedCategory === "All"}
                  onClick={() => setSelectedCategory("All")}
                  icon={Globe}
                />
              )}
              {trends?.activeCategories.map((cat) => (
                <FilterButton
                  key={cat}
                  label={cat.toUpperCase()}
                  count={trends.counts.categories[cat]}
                  isSelected={selectedCategory === cat}
                  onClick={() => {
                    setSelectedCategory(cat as any);
                    onClose();
                  }}
                  icon={CATEGORY_ICONS[cat as Category]}
                />
              ))}
            </div>
          </div>

          {/* Column 2: Regions (Sorted by volume) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                Active Regions
              </span>
              <span className="text-[9px] font-mono text-[#00BFFF]/50">
                Latest Activity
              </span>
            </div>
            <div className="flex flex-col gap-1.5 h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {!searchQuery && (
                <FilterButton
                  label="GLOBAL_OVERRIDE"
                  isSelected={selectedCountry === "All"}
                  onClick={() => setSelectedCountry("All")}
                  icon={Globe}
                />
              )}
              {trends?.activeCountries.map(([country, count]) => (
                <FilterButton
                  key={country}
                  label={country.toUpperCase()}
                  count={count}
                  isSelected={selectedCountry === country}
                  onClick={() => {
                    setSelectedCountry(country);
                    onClose();
                  }}
                  icon={MapPin}
                />
              ))}
            </div>
          </div>

          {/* Column 3: Pattern Match (Trending Tags) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                Intel Patterns
              </span>
              <span className="text-[9px] font-mono text-[#00BFFF]/50">
                Trending
              </span>
            </div>
            <div className="flex flex-wrap gap-2 content-start">
              {!searchQuery && (
                <button
                  onClick={() => {
                    setSelectedTag("All");
                    onClose();
                  }}
                  className={`px-3 py-2 font-mono text-[10px] border transition-all ${
                    selectedTag === "All"
                      ? "border-[#00BFFF] text-[#00BFFF] bg-[#00BFFF]/10"
                      : "border-white/5 text-gray-500 hover:border-white/20"
                  }`}
                >
                  * ALL_PATTERNS
                </button>
              )}
              {trends?.trendingTags.map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTag(tag);
                    onClose();
                  }}
                  className={`flex items-center gap-2 px-3 py-2 font-mono text-[10px] border transition-all ${
                    selectedTag === tag
                      ? "border-[#00BFFF] text-[#00BFFF] bg-[#00BFFF]/15 shadow-[0_0_15px_rgba(0,191,255,0.1)]"
                      : "border-white/5 bg-white/[0.02] text-gray-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  <span className="opacity-40">#</span>
                  <span>{tag.toUpperCase()}</span>
                  <span className="text-[8px] bg-[#00BFFF]/10 px-1 rounded text-[#00BFFF] font-bold">
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <div className="text-[9px] font-mono text-gray-600 uppercase flex items-center gap-4 tracking-widest">
            <span className="flex items-center gap-1.5">
              <div className="w-1 h-1 bg-[#00BFFF] rounded-full animate-ping" />{" "}
              FEED_SYNC_OK
            </span>
            <span className="opacity-20">|</span>
            <span>DATA_OBJECTS_TOTAL: {signals.length}</span>
          </div>
          <button
            onClick={onClose}
            className="px-10 py-2.5 bg-[#00BFFF] hover:bg-[#00BFFF]/80 text-black font-mono font-bold text-[11px] tracking-widest uppercase transition-all shadow-[0_0_30px_rgba(0,191,255,0.2)] active:scale-95"
          >
            Engage Parameters
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterButton({ label, count, isSelected, onClick, icon: Icon }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-3 font-mono text-[11px] transition-all border ${
        isSelected
          ? "bg-[#00BFFF]/10 border-[#00BFFF]/50 text-[#00BFFF] shadow-[inset_0_0_15px_rgba(0,191,255,0.05)]"
          : "border-transparent text-gray-400 hover:bg-white/5"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon
          size={14}
          className={isSelected ? "text-[#00BFFF]" : "text-gray-600"}
        />
        <span className="tracking-tighter">{label}</span>
      </div>
      {count !== undefined && (
        <span
          className={`text-[9px] font-bold ${isSelected ? "text-[#00BFFF]" : "text-gray-700"}`}
        >
          [{count}]
        </span>
      )}
    </button>
  );
}
