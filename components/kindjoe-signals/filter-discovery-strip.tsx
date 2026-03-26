"use client";

import { X } from "lucide-react";
import type { Category, GeographicScope, Signal } from "@/lib/aggregator/types";
import { GEO_SCOPE_LABELS } from "@/lib/aggregator/types";
import { cn } from "@/lib/utils";
import { useSignalsColorMode } from "@/components/kindjoe-signals/signals-color-mode";

const USA_COUNTRY_ALIASES = ["USA", "United States", "US"] as const;

export function resolveUsaCountryFromSignals(signals: Signal[]): string {
  const countries = new Set(signals.map((s) => s.country));
  for (const alias of USA_COUNTRY_ALIASES) {
    if (countries.has(alias)) return alias;
  }
  const match = [...countries].find(
    (c) =>
      c.toLowerCase() === "usa" ||
      c.toLowerCase() === "us" ||
      c.toLowerCase().includes("united states"),
  );
  return match ?? "USA";
}

export interface FilterDiscoveryStripProps {
  signals: Signal[];
  selectedCategory: Category | "All";
  selectedCountry: string | "All";
  selectedTag: string | "All";
  selectedGeographicScope: GeographicScope | "All";
  onPresetAll: () => void;
  onPresetLocal: () => void;
  onPresetUsa: () => void;
  onPresetGlobalScale: () => void;
  onOpenTrending: () => void;
  setSelectedCategory: (c: Category | "All") => void;
  setSelectedCountry: (c: string | "All") => void;
  setSelectedTag: (t: string | "All") => void;
  setSelectedGeographicScope: (g: GeographicScope | "All") => void;
}

function PresetChip({
  label,
  onClick,
  active,
  isLight,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  isLight: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors",
        active
          ? isLight
            ? "border-red-300 bg-red-100 text-red-900"
            : "border-red-400/70 bg-red-950/50 text-red-200"
          : isLight
            ? "border-red-200/80 bg-white text-red-700 hover:border-red-300 hover:bg-red-50"
            : "border-red-500/25 bg-red-950/15 text-red-300/85 hover:border-red-500/45 hover:bg-red-950/30",
      )}
    >
      {label}
    </button>
  );
}

function ActiveChip({
  label,
  onRemove,
  isLight,
}: {
  label: string;
  onRemove: () => void;
  isLight: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-[min(100%,12rem)] shrink-0 items-center gap-1 rounded-full border py-1 pl-2.5 pr-1 text-[10px] font-semibold",
        isLight
          ? "border-sky-300 bg-sky-50 text-sky-900"
          : "border-cyan-500/35 bg-cyan-950/30 text-cyan-200/95",
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          isLight
            ? "text-sky-600 hover:bg-sky-100 hover:text-sky-900"
            : "text-cyan-400/80 hover:bg-white/10 hover:text-cyan-200",
        )}
        aria-label={`Remove ${label}`}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </span>
  );
}

export default function FilterDiscoveryStrip({
  signals,
  selectedCategory,
  selectedCountry,
  selectedTag,
  selectedGeographicScope,
  onPresetAll,
  onPresetLocal,
  onPresetUsa,
  onPresetGlobalScale,
  onOpenTrending,
  setSelectedCategory,
  setSelectedCountry,
  setSelectedTag,
  setSelectedGeographicScope,
}: FilterDiscoveryStripProps) {
  const { mode } = useSignalsColorMode();
  const isLight = mode === "light";
  const usaLabel = resolveUsaCountryFromSignals(signals);

  const presetAllActive =
    selectedCategory === "All" &&
    selectedCountry === "All" &&
    selectedTag === "All" &&
    selectedGeographicScope === "All";

  const presetLocalActive =
    selectedGeographicScope === "local" &&
    selectedCountry === "All" &&
    selectedCategory === "All" &&
    selectedTag === "All";

  const presetUsaActive =
    selectedCountry === usaLabel &&
    selectedGeographicScope === "All" &&
    selectedCategory === "All" &&
    selectedTag === "All";

  const presetGlobalScaleActive =
    selectedGeographicScope === "global" &&
    selectedCountry === "All" &&
    selectedCategory === "All" &&
    selectedTag === "All";

  const activeChips: { key: string; label: string; onRemove: () => void }[] =
    [];
  if (selectedCategory !== "All") {
    activeChips.push({
      key: "cat",
      label: `Topic: ${selectedCategory}`,
      onRemove: () => setSelectedCategory("All"),
    });
  }
  if (selectedCountry !== "All") {
    activeChips.push({
      key: "country",
      label: `Region: ${selectedCountry}`,
      onRemove: () => setSelectedCountry("All"),
    });
  }
  if (selectedGeographicScope !== "All") {
    activeChips.push({
      key: "scope",
      label: `Scale: ${GEO_SCOPE_LABELS[selectedGeographicScope]}`,
      onRemove: () => setSelectedGeographicScope("All"),
    });
  }
  if (selectedTag !== "All") {
    activeChips.push({
      key: "tag",
      label: `#${selectedTag}`,
      onRemove: () => setSelectedTag("All"),
    });
  }

  return (
    <div
      className={cn(
        "border-b px-3 py-2 md:px-6",
        isLight
          ? "border-red-200/60 bg-slate-100/90"
          : "border-red-950/30 bg-[#050508]/90",
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "hidden shrink-0 text-[9px] font-bold uppercase tracking-widest sm:inline",
              isLight ? "text-red-600/70" : "text-red-500/50",
            )}
          >
            Quick
          </span>
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <PresetChip
              label="Everything"
              onClick={onPresetAll}
              active={presetAllActive}
              isLight={isLight}
            />
            <PresetChip
              label="Local"
              onClick={onPresetLocal}
              active={presetLocalActive}
              isLight={isLight}
            />
            <PresetChip
              label="USA"
              onClick={onPresetUsa}
              active={presetUsaActive}
              isLight={isLight}
            />
            <PresetChip
              label="Global-scale"
              onClick={onPresetGlobalScale}
              active={presetGlobalScaleActive}
              isLight={isLight}
            />
            <PresetChip
              label="Trending tags"
              onClick={onOpenTrending}
              isLight={isLight}
            />
          </div>
        </div>
        {activeChips.length > 0 && (
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 border-t pt-2",
              isLight ? "border-slate-200" : "border-white/5",
            )}
          >
            <span
              className={cn(
                "text-[9px] font-bold uppercase tracking-widest",
                isLight ? "text-slate-500" : "text-gray-500",
              )}
            >
              Active
            </span>
            {activeChips.map((c) => (
              <ActiveChip
                key={c.key}
                label={c.label}
                onRemove={c.onRemove}
                isLight={isLight}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
