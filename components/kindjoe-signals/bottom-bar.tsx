"use client";

import type { RefObject } from "react";
import { Filter, Globe, Search, X } from "lucide-react";

export type GlobeStyleOption = "realistic" | "dark" | "wireframe";

interface BottomBarProps {
  globeStyle: GlobeStyleOption;
  setGlobeStyle: (style: GlobeStyleOption) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filteredCount: number;
  totalCount: number;
  onOpenFilters: () => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
}

export default function BottomBar({
  globeStyle,
  setGlobeStyle,
  searchQuery,
  onSearchChange,
  filteredCount,
  totalCount,
  onOpenFilters,
  searchInputRef,
}: BottomBarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] border-t border-red-950/35 bg-[#050508]/95 pb-[env(safe-area-inset-bottom,0px)] font-mono shadow-[0_-12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
      role="toolbar"
      aria-label="Signals toolbar"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-600/30 to-transparent" />

      <div className="relative flex min-h-12 items-center justify-between gap-2 px-3 py-1.5 md:gap-4 md:px-6 md:py-2">
        <div className="flex min-w-0 items-center gap-2 md:flex-1 md:gap-4">
          <button
            type="button"
            onClick={onOpenFilters}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded border border-red-500/25 bg-red-950/20 px-2.5 text-[9px] font-bold uppercase tracking-widest text-red-300/90 transition-colors hover:border-red-500/45 hover:bg-red-950/35 md:px-3"
          >
            <Filter className="h-3.5 w-3.5 text-red-400" aria-hidden />
            <span className="hidden sm:inline">Filters</span>
          </button>

          <div className="hidden h-4 w-px shrink-0 bg-white/10 md:block" />

          <div className="relative hidden min-h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1.5 md:flex md:max-w-md md:border-transparent md:bg-transparent md:px-0 md:py-0">
            <Search
              className="h-4 w-4 shrink-0 text-red-500/50"
              aria-hidden
            />
            <span className="hidden text-[10px] font-bold text-red-500/40 md:inline">
              {">"}
            </span>
            <input
              ref={searchInputRef}
              id="signals-feed-search"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search headlines, places, tags…"
              autoComplete="off"
              className="min-h-9 min-w-0 flex-1 bg-transparent py-1 text-[12px] text-white placeholder:text-gray-600 focus:outline-none md:min-h-0 md:text-[11px] md:uppercase md:tracking-wider"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-gray-500 hover:bg-white/10 hover:text-white"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-4">
          <div className="hidden text-[9px] tracking-widest text-gray-500 uppercase md:flex md:flex-row md:items-center md:gap-2">
            <span className="text-red-400/80">View</span>
            <span className="tabular-nums text-gray-300">
              {filteredCount}
              <span className="text-gray-600"> / </span>
              {totalCount}
            </span>
          </div>

          <div className="hidden h-4 w-px shrink-0 bg-white/10 md:block" />

          <div className="flex items-center gap-1.5 md:gap-2">
            <Globe className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
            <label className="sr-only" htmlFor="signals-globe-layer">
              Globe appearance
            </label>
            <select
              id="signals-globe-layer"
              value={globeStyle}
              onChange={(e) =>
                setGlobeStyle(e.target.value as GlobeStyleOption)
              }
              className="max-w-[7.5rem] cursor-pointer bg-transparent text-[10px] text-gray-400 uppercase tracking-tight hover:text-white focus:outline-none md:max-w-none"
            >
              <option value="dark" className="bg-[#0A0A0F]">
                Vector dark
              </option>
              <option value="realistic" className="bg-[#0A0A0F]">
                Satellite
              </option>
              <option value="wireframe" className="bg-[#0A0A0F]">
                Topo grid
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
