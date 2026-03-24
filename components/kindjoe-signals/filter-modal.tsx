"use client";

import { Category } from "@/lib/aggregator/types";
import { CATEGORIES, COUNTRIES, POPULAR_TAGS } from "@/lib/aggregator/mock-data";
import {
  X,
  Globe,
  AlertTriangle,
  TrendingUp,
  Cpu,
  Flame,
  Users,
  MapPin,
  Hash,
} from "lucide-react";
import { useEffect } from "react";

const CATEGORY_ICONS: Record<Category, any> = {
  Geopolitics: Globe,
  "Conflicts & Wars": Flame,
  "Economy & Markets": TrendingUp,
  "Tech & Science": Cpu,
  "Disasters & Emergencies": AlertTriangle,
  "Viral / Social": Users,
};

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  selectedCategory,
  setSelectedCategory,
  selectedCountry,
  setSelectedCountry,
  selectedTag,
  setSelectedTag,
}: FilterModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0A0A0F] border border-gray-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-black/50">
          <h2 className="font-mono font-bold text-white tracking-wider flex items-center gap-2">
            <Globe size={16} className="text-[#00BFFF]" />
            FILTERS
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-8">
          {/* Categories */}
          <div className="flex-1">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Globe size={14} />
              Categories
            </h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setSelectedCategory("All")}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 font-mono text-sm text-left ${
                  selectedCategory === "All"
                    ? "bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/30 shadow-[0_0_15px_rgba(0,191,255,0.1)]"
                    : "text-gray-400 hover:bg-gray-800/50 hover:text-white border border-transparent"
                }`}
              >
                <Globe
                  size={16}
                  className={
                    selectedCategory === "All"
                      ? "text-[#00BFFF]"
                      : "text-gray-500"
                  }
                />
                <span>All Signals</span>
              </button>

              <div className="h-px bg-gray-800 my-1" />

              {CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat];
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 font-mono text-sm text-left ${
                      isSelected
                        ? "bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/30 shadow-[0_0_15px_rgba(0,191,255,0.1)]"
                        : "text-gray-400 hover:bg-gray-800/50 hover:text-white border border-transparent"
                    }`}
                  >
                    <Icon
                      size={16}
                      className={
                        isSelected ? "text-[#00BFFF]" : "text-gray-500"
                      }
                    />
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Countries */}
          <div className="flex-1">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <MapPin size={14} />
              Countries
            </h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setSelectedCountry("All")}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 font-mono text-sm text-left ${
                  selectedCountry === "All"
                    ? "bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/30 shadow-[0_0_15px_rgba(0,191,255,0.1)]"
                    : "text-gray-400 hover:bg-gray-800/50 hover:text-white border border-transparent"
                }`}
              >
                <Globe
                  size={16}
                  className={
                    selectedCountry === "All"
                      ? "text-[#00BFFF]"
                      : "text-gray-500"
                  }
                />
                <span>Global (All)</span>
              </button>

              <div className="h-px bg-gray-800 my-1" />

              <div className="grid grid-cols-2 gap-2">
                {COUNTRIES.map((country) => {
                  const isSelected = selectedCountry === country;
                  return (
                    <button
                      key={country}
                      onClick={() => setSelectedCountry(country)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 font-mono text-xs text-left ${
                        isSelected
                          ? "bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/30 shadow-[0_0_15px_rgba(0,191,255,0.1)]"
                          : "text-gray-400 hover:bg-gray-800/50 hover:text-white border border-transparent"
                      }`}
                    >
                      <MapPin
                        size={12}
                        className={
                          isSelected ? "text-[#00BFFF]" : "text-gray-500"
                        }
                      />
                      <span className="truncate">{country}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex-1">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Hash size={14} />
              Trending Tags
            </h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setSelectedTag("All")}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 font-mono text-sm text-left ${
                  selectedTag === "All"
                    ? "bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/30 shadow-[0_0_15px_rgba(0,191,255,0.1)]"
                    : "text-gray-400 hover:bg-gray-800/50 hover:text-white border border-transparent"
                }`}
              >
                <Hash
                  size={16}
                  className={
                    selectedTag === "All" ? "text-[#00BFFF]" : "text-gray-500"
                  }
                />
                <span>All Tags</span>
              </button>

              <div className="h-px bg-gray-800 my-1" />

              <div className="flex flex-wrap gap-2">
                {POPULAR_TAGS.map((tag) => {
                  const isSelected = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={`px-3 py-1.5 rounded-full transition-all duration-200 font-mono text-xs border ${
                        isSelected
                          ? "bg-[#00BFFF]/10 text-[#00BFFF] border-[#00BFFF]/30 shadow-[0_0_10px_rgba(0,191,255,0.1)]"
                          : "bg-gray-800/50 text-gray-400 border-transparent hover:text-white hover:bg-gray-700/50"
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-black/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#00BFFF] hover:bg-[#00BFFF]/80 text-black font-mono font-bold text-sm rounded transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
