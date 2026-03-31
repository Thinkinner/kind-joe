"use client";

import type { RefObject } from "react";
import { Filter, Globe, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AI_SUMMARY_DISCLAIMER } from "@/lib/signals/ai-summary-disclaimer";
import { useSignalsColorMode } from "@/components/kindjoe-signals/signals-color-mode";

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
  const { mode } = useSignalsColorMode();
  const isLight = mode === "light";

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[60] border-t pb-[env(safe-area-inset-bottom,0px)] font-mono backdrop-blur-md",
        isLight
          ? "border-slate-200 bg-white shadow-[0_-4px_24px_rgba(15,23,42,0.08)]"
          : "border-red-950/35 bg-[#050508]/95 shadow-[0_-12px_40px_rgba(0,0,0,0.45)]",
      )}
      aria-label="Signals toolbar and disclaimer"
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
          isLight ? "via-slate-200" : "via-red-600/30",
        )}
      />

      <p
        className={cn(
          "border-b px-3 py-1.5 text-center font-sans text-[9px] font-medium leading-snug sm:px-5 sm:text-[10px]",
          isLight
            ? "border-amber-200/90 bg-amber-50 text-amber-950"
            : "border-amber-500/25 bg-amber-950/45 text-amber-100/95",
        )}
        role="status"
      >
        {AI_SUMMARY_DISCLAIMER}
      </p>

      <div
        className="relative flex min-h-12 items-center justify-between gap-2 px-3 py-1.5 md:gap-4 md:px-6 md:py-2"
        role="toolbar"
      >
        <div className="flex min-w-0 items-center gap-2 md:flex-1 md:gap-4">
          <button
            type="button"
            onClick={onOpenFilters}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded border px-2.5 text-[9px] font-bold uppercase tracking-widest transition-colors md:px-3",
              isLight
                ? "border-red-200 bg-red-50 text-red-900 hover:border-red-300 hover:bg-red-100"
                : "border-red-500/25 bg-red-950/20 text-red-300/90 hover:border-red-500/45 hover:bg-red-950/35",
            )}
          >
            <Filter
              className={cn(
                "h-3.5 w-3.5",
                isLight ? "text-red-700" : "text-red-400",
              )}
              aria-hidden
            />
            <span className="hidden sm:inline">Filters</span>
          </button>

          <div
            className={cn(
              "hidden h-4 w-px shrink-0 md:block",
              isLight ? "bg-slate-300" : "bg-white/10",
            )}
          />

          <div
            className={cn(
              "relative hidden min-h-9 min-w-0 flex-1 items-center gap-2 rounded-md border px-2.5 py-1.5 md:flex md:max-w-md md:border-transparent md:bg-transparent md:px-0 md:py-0",
              isLight
                ? "border-slate-300 bg-white"
                : "border-white/5 bg-white/[0.02]",
            )}
          >
            <Search
              className={cn(
                "h-4 w-4 shrink-0",
                isLight ? "text-slate-400" : "text-red-500/50",
              )}
              aria-hidden
            />
            <span
              className={cn(
                "hidden text-[10px] font-bold md:inline",
                isLight ? "text-slate-400" : "text-red-500/40",
              )}
            >
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
              className={cn(
                "min-h-9 min-w-0 flex-1 bg-transparent py-1 text-[12px] focus:outline-none md:min-h-0 md:text-[11px] md:uppercase md:tracking-wider",
                isLight
                  ? "text-slate-950 placeholder:text-slate-500"
                  : "text-white placeholder:text-gray-600",
              )}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded",
                  isLight
                    ? "text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                    : "text-gray-500 hover:bg-white/10 hover:text-white",
                )}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-4">
          <div
            className={cn(
              "hidden text-[9px] uppercase tracking-widest md:flex md:flex-row md:items-center md:gap-2",
              isLight ? "text-slate-600" : "text-gray-500",
            )}
          >
            <span className={isLight ? "text-red-600/90" : "text-red-400/80"}>
              View
            </span>
            <span
              className={cn(
                "tabular-nums",
                isLight ? "text-slate-900" : "text-gray-300",
              )}
            >
              {filteredCount}
              <span className={isLight ? "text-slate-500" : "text-gray-600"}>
                {" "}
                /{" "}
              </span>
              {totalCount}
            </span>
          </div>

          <div
            className={cn(
              "hidden h-4 w-px shrink-0 md:block",
              isLight ? "bg-slate-300" : "bg-white/10",
            )}
          />

          <div className="flex items-center gap-1.5 md:gap-2">
            <Globe
              className={cn(
                "h-4 w-4 shrink-0",
                isLight ? "text-slate-600" : "text-gray-500",
              )}
              aria-hidden
            />
            <label className="sr-only" htmlFor="signals-globe-layer">
              Globe appearance
            </label>
            <select
              id="signals-globe-layer"
              value={globeStyle}
              onChange={(e) =>
                setGlobeStyle(e.target.value as GlobeStyleOption)
              }
              className={cn(
                "max-w-[7.5rem] cursor-pointer bg-transparent text-[10px] uppercase tracking-tight focus:outline-none md:max-w-none",
                isLight
                  ? "font-semibold text-slate-900 hover:text-slate-950"
                  : "text-gray-400 hover:text-white",
              )}
            >
              <option
                value="dark"
                className={isLight ? "bg-white text-slate-900" : "bg-[#0A0A0F]"}
              >
                Vector dark
              </option>
              <option
                value="realistic"
                className={isLight ? "bg-white text-slate-900" : "bg-[#0A0A0F]"}
              >
                Satellite
              </option>
              <option
                value="wireframe"
                className={isLight ? "bg-white text-slate-900" : "bg-[#0A0A0F]"}
              >
                Topo grid
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
