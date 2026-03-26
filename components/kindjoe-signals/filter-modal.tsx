"use client";

import {
  useMemo,
  useEffect,
  useState,
  useCallback,
  type ComponentType,
} from "react";
import {
  Category,
  Signal,
  type GeographicScope,
  GEO_SCOPE_LABELS,
} from "@/lib/aggregator/types";
import FilterDiscoveryStrip, {
  resolveUsaCountryFromSignals,
} from "@/components/kindjoe-signals/filter-discovery-strip";
import {
  X,
  Globe,
  TrendingUp,
  Briefcase,
  Cpu,
  Flame,
  MapPin,
  Target,
  Zap,
  Layers,
  Hash,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSignalsColorMode } from "@/components/kindjoe-signals/signals-color-mode";

const CATEGORY_ICONS: Record<
  Category,
  ComponentType<{ size?: number; className?: string }>
> =
  {
    Geopolitics: Globe,
    "Conflicts & Wars": Flame,
    "Economy & Markets": TrendingUp,
    Business: Briefcase,
    "Tech & Science": Cpu,
    "Disasters & Emergencies": Zap,
    "Viral / Social": Target,
  };

export type FilterModalTab = "scale" | "region" | "topic" | "tags";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: FilterModalTab;
  signals: Signal[];
  selectedCategory: Category | "All";
  setSelectedCategory: (cat: Category | "All") => void;
  selectedCountry: string | "All";
  setSelectedCountry: (country: string | "All") => void;
  selectedTag: string | "All";
  setSelectedTag: (tag: string | "All") => void;
  selectedGeographicScope: GeographicScope | "All";
  setSelectedGeographicScope: (scope: GeographicScope | "All") => void;
}

const TABS: { id: FilterModalTab; label: string }[] = [
  { id: "scale", label: "Story scale" },
  { id: "region", label: "Region" },
  { id: "topic", label: "Topic" },
  { id: "tags", label: "Trending tags" },
];

const GEO_ORDER: GeographicScope[] = [
  "local",
  "regional",
  "national",
  "global",
];

export default function FilterModal({
  isOpen,
  onClose,
  initialTab = "topic",
  signals = [],
  selectedCategory,
  setSelectedCategory,
  selectedCountry,
  setSelectedCountry,
  selectedTag,
  setSelectedTag,
  selectedGeographicScope,
  setSelectedGeographicScope,
}: FilterModalProps) {
  const { mode } = useSignalsColorMode();
  const isLight = mode === "light";
  const [tab, setTab] = useState<FilterModalTab>(initialTab);
  const [listFilter, setListFilter] = useState("");

  useEffect(() => {
    if (isOpen) setTab(initialTab);
  }, [isOpen, initialTab]);

  const trends = useMemo(() => {
    const stats = {
      categories: {} as Record<string, number>,
      countries: {} as Record<string, number>,
      tags: {} as Record<string, number>,
    };

    if (!signals || !Array.isArray(signals)) return null;

    signals.forEach((s) => {
      if (!s) return;
      stats.categories[s.category] = (stats.categories[s.category] || 0) + 1;
      stats.countries[s.country] = (stats.countries[s.country] || 0) + 1;
      if (s.tags) {
        s.tags.forEach((tag) => {
          const key = tag.toLowerCase();
          stats.tags[key] = (stats.tags[key] || 0) + 1;
        });
      }
    });

    const query = listFilter.toLowerCase().trim();

    return {
      activeCategories: (Object.keys(CATEGORY_ICONS) as Category[]).filter(
        (c) => c.toLowerCase().includes(query),
      ),
      activeCountries: Object.entries(stats.countries)
        .filter(([name]) => name.toLowerCase().includes(query))
        .sort((a, b) => b[1] - a[1]),
      trendingTags: Object.entries(stats.tags)
        .filter(([name]) => name.toLowerCase().includes(query))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 40),
      counts: stats,
    };
  }, [signals, listFilter]);

  const usaCountry = useMemo(
    () => resolveUsaCountryFromSignals(signals),
    [signals],
  );

  const presetAll = useCallback(() => {
    setSelectedCategory("All");
    setSelectedCountry("All");
    setSelectedTag("All");
    setSelectedGeographicScope("All");
  }, [
    setSelectedCategory,
    setSelectedCountry,
    setSelectedTag,
    setSelectedGeographicScope,
  ]);

  const presetLocal = useCallback(() => {
    setSelectedCategory("All");
    setSelectedCountry("All");
    setSelectedTag("All");
    setSelectedGeographicScope("local");
  }, [
    setSelectedCategory,
    setSelectedCountry,
    setSelectedTag,
    setSelectedGeographicScope,
  ]);

  const presetUsa = useCallback(() => {
    setSelectedCategory("All");
    setSelectedTag("All");
    setSelectedGeographicScope("All");
    setSelectedCountry(resolveUsaCountryFromSignals(signals));
  }, [
    signals,
    setSelectedCategory,
    setSelectedTag,
    setSelectedGeographicScope,
    setSelectedCountry,
  ]);

  const presetGlobalScale = useCallback(() => {
    setSelectedCategory("All");
    setSelectedCountry("All");
    setSelectedTag("All");
    setSelectedGeographicScope("global");
  }, [
    setSelectedCategory,
    setSelectedCountry,
    setSelectedTag,
    setSelectedGeographicScope,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center p-3 backdrop-blur-xl sm:p-4",
        isLight ? "bg-slate-900/40" : "bg-[#050508]/95",
      )}
    >
      <div
        data-signals-filter-modal
        className={cn(
          "flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border shadow-[0_0_80px_rgba(0,0,0,1)] sm:max-w-2xl",
          isLight
            ? "border-slate-200 bg-white"
            : "border-white/10 bg-[#0A0A0F]",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between border-b px-4 py-4 sm:px-6",
            isLight
              ? "border-slate-200 bg-slate-50"
              : "border-white/10 bg-white/[0.02]",
          )}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-md border border-[#00BFFF]/30 bg-[#00BFFF]/10 p-2">
              <Layers size={18} className="text-[#00BFFF]" />
            </div>
            <div>
              <p
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.2em]",
                  isLight ? "text-red-600" : "text-red-400/90",
                )}
              >
                Signals
              </p>
              <h2
                className={cn(
                  "text-sm font-semibold",
                  isLight ? "text-slate-900" : "text-white",
                )}
              >
                Find the news you want
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "rounded-full border p-2 transition-colors",
              isLight
                ? "border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                : "border-white/10 text-gray-500 hover:bg-white/5 hover:text-white",
            )}
          >
            <X size={20} />
          </button>
        </div>

        <div
          className={cn(
            "border-b py-1",
            isLight ? "border-slate-200 bg-slate-100/80" : "border-white/10 bg-[#06060a]",
          )}
        >
          <FilterDiscoveryStrip
            signals={signals}
            selectedCategory={selectedCategory}
            selectedCountry={selectedCountry}
            selectedTag={selectedTag}
            selectedGeographicScope={selectedGeographicScope}
            onPresetAll={presetAll}
            onPresetLocal={presetLocal}
            onPresetUsa={presetUsa}
            onPresetGlobalScale={presetGlobalScale}
            onOpenTrending={() => setTab("tags")}
            setSelectedCategory={setSelectedCategory}
            setSelectedCountry={setSelectedCountry}
            setSelectedTag={setSelectedTag}
            setSelectedGeographicScope={setSelectedGeographicScope}
          />
        </div>

        <div
          className={cn(
            "flex flex-wrap gap-1 border-b px-3 py-2 sm:px-4",
            isLight
              ? "border-slate-200 bg-slate-100/50"
              : "border-white/5 bg-black/30",
          )}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors",
                tab === t.id
                  ? isLight
                    ? "bg-red-100 text-red-800 ring-1 ring-red-300/60"
                    : "bg-red-600/25 text-red-200 ring-1 ring-red-500/40"
                  : isLight
                    ? "text-slate-500 hover:bg-slate-200/80 hover:text-slate-800"
                    : "text-gray-500 hover:bg-white/5 hover:text-gray-300",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          className={cn(
            "flex items-center gap-3 border-b px-4 py-3 sm:px-6",
            isLight
              ? "border-slate-200 bg-slate-50"
              : "border-white/5 bg-white/[0.02]",
          )}
        >
          <Search size={16} className="shrink-0 text-[#00BFFF]/70" />
          <input
            type="text"
            value={listFilter}
            onChange={(e) => setListFilter(e.target.value)}
            placeholder="Filter these lists…"
            className={cn(
              "min-w-0 flex-1 bg-transparent text-sm outline-none",
              isLight
                ? "text-slate-900 placeholder:text-slate-400"
                : "text-white placeholder:text-gray-600",
            )}
          />
          {listFilter ? (
            <button
              type="button"
              onClick={() => setListFilter("")}
              className={cn(
                "shrink-0 text-xs",
                isLight
                  ? "text-slate-500 hover:text-slate-900"
                  : "text-gray-500 hover:text-white",
              )}
            >
              Clear
            </button>
          ) : null}
        </div>

        <div
          className={cn(
            "min-h-[min(50vh,320px)] flex-1 overflow-y-auto p-4 sm:p-6",
            isLight ? "bg-white" : "",
          )}
        >
          {tab === "scale" && (
            <div className="space-y-2">
              <p
                className={cn(
                  "mb-3 text-xs",
                  isLight ? "text-slate-600" : "text-gray-500",
                )}
              >
                How big the story is geographically — local bulletins vs
                cross-border coverage.
              </p>
              <FilterRow
                label="Any scale"
                description="Show all story sizes"
                isSelected={selectedGeographicScope === "All"}
                onClick={() => {
                  setSelectedGeographicScope("All");
                  onClose();
                }}
                icon={Globe}
              />
              {GEO_ORDER.map((scope) => (
                <FilterRow
                  key={scope}
                  label={GEO_SCOPE_LABELS[scope]}
                  description={
                    scope === "local"
                      ? "City or neighborhood"
                      : scope === "regional"
                        ? "State, province, or metro"
                        : scope === "national"
                          ? "Whole country"
                          : "Cross-border / worldwide"
                  }
                  isSelected={selectedGeographicScope === scope}
                  onClick={() => {
                    setSelectedGeographicScope(scope);
                    onClose();
                  }}
                  icon={MapPin}
                />
              ))}
            </div>
          )}

          {tab === "region" && (
            <div className="space-y-2">
              <p
                className={cn(
                  "mb-3 text-xs",
                  isLight ? "text-slate-600" : "text-gray-500",
                )}
              >
                Narrow the map and feed to one country, or browse everywhere.
              </p>
              <FilterRow
                label="Everywhere"
                description="All countries"
                isSelected={selectedCountry === "All"}
                onClick={() => {
                  setSelectedCountry("All");
                  onClose();
                }}
                icon={Globe}
              />
              {signals.some((s) => s.country === usaCountry) && (
                <FilterRow
                  label="United States"
                  description={`Match: ${usaCountry}`}
                  isSelected={selectedCountry === usaCountry}
                  count={trends?.counts?.countries?.[usaCountry]}
                  onClick={() => {
                    setSelectedCountry(usaCountry);
                    onClose();
                  }}
                  icon={MapPin}
                />
              )}
              <div
                className={cn(
                  "pt-2 text-[10px] font-bold uppercase tracking-widest",
                  isLight ? "text-slate-500" : "text-gray-600",
                )}
              >
                By activity
              </div>
              <div className="max-h-[40vh] space-y-1 overflow-y-auto pr-1">
                {trends?.activeCountries
                  ?.filter(([country]) => country !== usaCountry)
                  ?.map(([country, count]) => (
                    <FilterButton
                      key={country}
                      label={country}
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
          )}

          {tab === "topic" && (
            <div className="space-y-1">
              <p
                className={cn(
                  "mb-3 text-xs",
                  isLight ? "text-slate-600" : "text-gray-500",
                )}
              >
                Broad categories — same as keyboard shortcuts 1–5 for some
                topics.
              </p>
              {!listFilter && (
                <FilterButton
                  label="All topics"
                  count={signals.length}
                  isSelected={selectedCategory === "All"}
                  onClick={() => {
                    setSelectedCategory("All");
                    onClose();
                  }}
                  icon={Globe}
                />
              )}
              {trends?.activeCategories?.map((cat) => (
                <FilterButton
                  key={cat}
                  label={cat}
                  count={trends?.counts?.categories?.[cat]}
                  isSelected={selectedCategory === cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    onClose();
                  }}
                  icon={CATEGORY_ICONS[cat]}
                />
              ))}
            </div>
          )}

          {tab === "tags" && (
            <div>
              <p
                className={cn(
                  "mb-3 text-xs",
                  isLight ? "text-slate-600" : "text-gray-500",
                )}
              >
                Trending keywords in the current feed — tap to filter.
              </p>
              <div className="flex flex-wrap gap-2">
                {!listFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTag("All");
                      onClose();
                    }}
                    className={cn(
                      "rounded-md border px-3 py-2 text-xs font-semibold transition-all",
                      selectedTag === "All"
                        ? "border-[#00BFFF] bg-[#00BFFF]/10 text-[#00BFFF]"
                        : isLight
                          ? "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900"
                          : "border-white/10 text-gray-500 hover:border-white/25 hover:text-white",
                    )}
                  >
                    All tags
                  </button>
                )}
                {trends?.trendingTags?.map(([tag, count]) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setSelectedTag(tag);
                      onClose();
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-all",
                      selectedTag === tag
                        ? "border-[#00BFFF] bg-[#00BFFF]/15 text-[#00BFFF] shadow-[0_0_15px_rgba(0,191,255,0.08)]"
                        : isLight
                          ? "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                          : "border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20 hover:text-white",
                    )}
                  >
                    <Hash className="h-3.5 w-3.5 opacity-50" aria-hidden />
                    <span>{tag}</span>
                    <span className="rounded bg-[#00BFFF]/15 px-1.5 text-[10px] font-bold text-[#00BFFF]">
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex items-center justify-between border-t px-4 py-4 sm:px-6",
            isLight
              ? "border-slate-200 bg-slate-50"
              : "border-white/10 bg-white/[0.02]",
          )}
        >
          <p
            className={cn(
              "text-[10px]",
              isLight ? "text-slate-500" : "text-gray-600",
            )}
          >
            {signals.length}{" "}
            {signals.length === 1 ? "story" : "stories"} loaded
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-[#00BFFF] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-black shadow-[0_0_24px_rgba(0,191,255,0.2)] transition-all hover:bg-[#00BFFF]/85 active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterRow({
  label,
  description,
  count,
  isSelected,
  onClick,
  icon: Icon,
}: {
  label: string;
  description: string;
  count?: number;
  isSelected: boolean;
  onClick: () => void;
  icon: ComponentType<{ size?: number; className?: string }>;
}) {
  const { mode } = useSignalsColorMode();
  const isLight = mode === "light";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-3 text-left transition-all",
        isSelected
          ? "border-[#00BFFF]/50 bg-[#00BFFF]/10 text-[#00BFFF]"
          : isLight
            ? "border-transparent text-slate-600 hover:bg-slate-100"
            : "border-transparent text-gray-400 hover:bg-white/[0.04]",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon
          size={16}
          className={
            isSelected
              ? "text-[#00BFFF]"
              : isLight
                ? "text-slate-400"
                : "text-gray-600"
          }
        />
        <div className="min-w-0">
          <div
            className={cn(
              "text-sm font-semibold",
              isLight ? "text-slate-900" : "text-white",
            )}
          >
            {label}
          </div>
          <div
            className={cn(
              "text-[11px]",
              isLight ? "text-slate-500" : "text-gray-500",
            )}
          >
            {description}
          </div>
        </div>
      </div>
      {count !== undefined && (
        <span
          className={cn(
            "shrink-0 text-xs font-bold",
            isSelected
              ? "text-[#00BFFF]"
              : isLight
                ? "text-slate-400"
                : "text-gray-600",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function FilterButton({
  label,
  count,
  isSelected,
  onClick,
  icon: Icon,
}: {
  label: string;
  count?: number;
  isSelected: boolean;
  onClick: () => void;
  icon: ComponentType<{ size?: number; className?: string }>;
}) {
  const { mode } = useSignalsColorMode();
  const isLight = mode === "light";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-all",
        isSelected
          ? "border-[#00BFFF]/50 bg-[#00BFFF]/10 text-[#00BFFF]"
          : isLight
            ? "border-transparent text-slate-700 hover:bg-slate-100"
            : "border-transparent text-gray-400 hover:bg-white/[0.04]",
      )}
    >
      <div className="flex items-center gap-3">
        <Icon
          size={15}
          className={
            isSelected
              ? "text-[#00BFFF]"
              : isLight
                ? "text-slate-400"
                : "text-gray-600"
          }
        />
        <span className="font-medium">{label}</span>
      </div>
      {count !== undefined && (
        <span
          className={cn(
            "text-xs font-bold",
            isSelected
              ? "text-[#00BFFF]"
              : isLight
                ? "text-slate-400"
                : "text-gray-600",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
