"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type CSSProperties,
} from "react";
import dynamic from "next/dynamic";
import Pusher from "pusher-js";
import TopBar from "@/components/kindjoe-signals/top-bar";
import Feed from "@/components/domains/signals/feed";
import BottomBar from "@/components/kindjoe-signals/bottom-bar";
import FilterModal from "@/components/kindjoe-signals/filter-modal";
import {
  Signal,
  Category,
  Source,
  type GeographicScope,
  type PusherSignalPayload,
} from "@/lib/aggregator/types";
import { getHistory } from "@/lib/domains/signals/actions/news-signal";
import { SIGNALS_HISTORY_LIMIT } from "@/lib/signals/signals-history-limit";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSpotlightSignal } from "@/hooks/use-spotlight-signal";
import { cn } from "@/lib/utils";
import { useSignalsColorMode } from "@/components/kindjoe-signals/signals-color-mode";
import {
  MobileIntelSheet,
  MOBILE_INTEL_SHEET_MIN_VISIBLE_PX,
} from "@/components/kindjoe-signals/mobile-intel-sheet";
import { KindJoeWatchAccountNudge } from "@/components/kindjoe-signals/kindjoe-watch-account-nudge";
import { effectiveImpactScore } from "@/lib/signals/impact-tier";
import { hasPlausibleLatLng } from "@/lib/signals/plausible-coords";

const SOURCE_SET = new Set<Source>([
  "X",
  "Telegram",
  "Discord",
  "RSS",
  "Google News",
  "Apple Newsroom",
  "USGS Earthquakes",
]);
const FEED_SOURCE_WHITELIST = new Set<Source>(["X"]);
const CATEGORY_SET = new Set<Category>([
  "World",
  "Military",
  "Finance",
  "Environment",
  "Energy",
  "Tech",
  "Health",
  "Society",
]);

function parseInboundImpactScore(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim());
    if (Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n)));
  }
  return 0;
}

/** Coerces live Pusher payloads into a full Signal (missing geo fields + legacy events). */
function normalizePusherSignal(raw: PusherSignalPayload): Signal {
  const g = raw.geographicScope;
  const scope: GeographicScope =
    g === "local" || g === "regional" || g === "national" || g === "global"
      ? g
      : "global";

  const source: Source =
    raw.source !== undefined && SOURCE_SET.has(raw.source) ? raw.source : "X";

  const rawRec = raw as Record<string, unknown>;
  const nestedRaw = rawRec.enriched;
  const nested =
    nestedRaw != null &&
    typeof nestedRaw === "object" &&
    !Array.isArray(nestedRaw)
      ? (nestedRaw as Record<string, unknown>)
      : null;

  const nestedCategory =
    nested && typeof nested.category === "string" ? nested.category : undefined;
  const category: Category =
    raw.category !== undefined && CATEGORY_SET.has(raw.category)
      ? raw.category
      : nestedCategory !== undefined && CATEGORY_SET.has(nestedCategory as Category)
        ? (nestedCategory as Category)
        : "World";

  const sourceUrlRaw = raw.sourceUrl ?? rawRec.source_url;
  const sourceUrl =
    typeof sourceUrlRaw === "string" && sourceUrlRaw.trim()
      ? sourceUrlRaw.trim()
      : undefined;

  const enrichmentProvider =
    (typeof rawRec.enrichmentProvider === "string"
      ? rawRec.enrichmentProvider
      : typeof rawRec.enrichment_provider === "string"
        ? rawRec.enrichment_provider
        : undefined) ??
    (nested && typeof nested.enrichmentProvider === "string"
      ? nested.enrichmentProvider
      : undefined) ??
    (nested && typeof nested.enrichment_provider === "string"
      ? nested.enrichment_provider
      : undefined);

  const enrichmentModel =
    (typeof rawRec.enrichmentModel === "string"
      ? rawRec.enrichmentModel
      : typeof rawRec.enrichment_model === "string"
        ? rawRec.enrichment_model
        : undefined) ??
    (nested && typeof nested.enrichmentModel === "string"
      ? nested.enrichmentModel
      : undefined) ??
    (nested && typeof nested.enrichment_model === "string"
      ? nested.enrichment_model
      : undefined);

  const enrichmentConfidenceRaw =
    rawRec.enrichmentConfidence ?? rawRec.enrichment_confidence;
  const nestedConf =
    nested?.enrichmentConfidence ?? nested?.enrichment_confidence;
  const enrichmentConfidenceParsed =
    typeof enrichmentConfidenceRaw === "number"
      ? enrichmentConfidenceRaw
      : typeof enrichmentConfidenceRaw === "string" &&
          enrichmentConfidenceRaw.trim()
        ? Number(enrichmentConfidenceRaw.trim())
        : typeof nestedConf === "number"
          ? nestedConf
          : typeof nestedConf === "string" && String(nestedConf).trim()
            ? Number(String(nestedConf).trim())
            : undefined;
  const enrichmentConfidence =
    typeof enrichmentConfidenceParsed === "number" &&
    Number.isFinite(enrichmentConfidenceParsed)
      ? enrichmentConfidenceParsed
      : undefined;

  const wrappedPayload =
    rawRec.payload != null &&
    typeof rawRec.payload === "object" &&
    !Array.isArray(rawRec.payload)
      ? (rawRec.payload as Record<string, unknown>)
      : null;

  const impactParsed = parseInboundImpactScore(
    raw.impactScore ??
      rawRec.impact_score ??
      nested?.impactScore ??
      nested?.impact_score ??
      wrappedPayload?.impactScore ??
      wrappedPayload?.impact_score,
  );

  let lat: number | null =
    typeof raw.lat === "number"
      ? raw.lat
      : typeof nested?.lat === "number"
        ? nested.lat
        : null;
  let lng: number | null =
    typeof raw.lng === "number"
      ? raw.lng
      : typeof nested?.lng === "number"
        ? nested.lng
        : null;
  if (!hasPlausibleLatLng(lat, lng)) {
    lat = null;
    lng = null;
  }

  const base: Signal = {
    id: raw.id,
    headline: raw.headline,
    summary: raw.summary ?? "",
    source,
    sourceUrl,
    category,
    lat,
    lng,
    city: raw.city ?? "Unknown",
    country: raw.country ?? "Unknown",
    geographicScope: scope,
    adminArea: raw.adminArea ?? "",
    impactScore: impactParsed,
    timestamp: raw.timestamp,
    tags: raw.tags ?? [],
    canonicalSourceUrl:
      typeof rawRec.canonicalSourceUrl === "string"
        ? rawRec.canonicalSourceUrl
        : undefined,
    sourceDisplayName:
      typeof rawRec.sourceDisplayName === "string"
        ? rawRec.sourceDisplayName
        : undefined,
    sourceHandle:
      typeof rawRec.sourceHandle === "string" ? rawRec.sourceHandle : undefined,
    sourceIconKey:
      typeof rawRec.sourceIconKey === "string"
        ? rawRec.sourceIconKey
        : undefined,
    sourceAvatarUrl:
      typeof rawRec.sourceAvatarUrl === "string"
        ? rawRec.sourceAvatarUrl
        : typeof rawRec.source_avatar_url === "string"
          ? rawRec.source_avatar_url
          : undefined,
    sourceVerified:
      rawRec.sourceVerified === true || rawRec.source_verified === true,
    trustTier:
      rawRec.trustTier === "low" ||
      rawRec.trustTier === "medium" ||
      rawRec.trustTier === "high"
        ? rawRec.trustTier
        : undefined,
    trustScore:
      typeof rawRec.trustScore === "number" ? rawRec.trustScore : undefined,
    mediaUrls: Array.isArray(rawRec.mediaUrls)
      ? (rawRec.mediaUrls.filter((v) => typeof v === "string") as string[])
      : undefined,
    enrichmentProvider,
    enrichmentModel,
    enrichmentConfidence,
  };

  return {
    ...base,
    impactScore: effectiveImpactScore(base),
  };
}

function GlobeLoadingFallback() {
  const { mode } = useSignalsColorMode();
  const isLight = mode === "light";
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center",
        isLight ? "bg-slate-100" : "bg-[#0A0A0F]",
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-8 w-8">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00BFFF] opacity-75" />
          <span className="relative inline-flex h-8 w-8 rounded-full bg-[#00BFFF]" />
        </div>
        <span className="font-mono text-sm tracking-widest text-[#00BFFF] animate-pulse">
          INITIALIZING AETHER...
        </span>
      </div>
    </div>
  );
}

// Dynamically import GlobeComponent to avoid SSR issues with react-globe.gl
const GlobeComponent = dynamic(
  () => import("@/components/kindjoe-signals/globe-component"),
  {
    ssr: false,
    loading: () => <GlobeLoadingFallback />,
  },
);

export default function Home() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | "All">(
    "All",
  );
  const [selectedCountry, setSelectedCountry] = useState<string | "All">("All");
  const [selectedTag, setSelectedTag] = useState<string | "All">("All");
  const [selectedGeographicScope, setSelectedGeographicScope] = useState<
    GeographicScope | "All"
  >("All");
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [globeStyle, setGlobeStyle] = useState<
    "realistic" | "dark" | "wireframe"
  >("dark");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalInitialTab, setFilterModalInitialTab] = useState<
    "scale" | "region" | "topic" | "tags"
  >("topic");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  // useEffect(() => {
  //   // Only run this on the client
  //   const initBeams = async () => {
  //     try {
  //       const beamsClient = new PusherPushNotifications.Client({
  //         instanceId: "a0d2edd7-8930-4c20-954a-852022ee0754", // Your ID
  //       });

  //       await beamsClient.start();
  //       await beamsClient.addDeviceInterest("hello");
  //       console.log("Successfully registered and subscribed to Beams!");
  //     } catch (error) {
  //       console.error("Beams auth error:", error);
  //     }
  //   };

  //   initBeams();
  // }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        const history = await getHistory();
        setSignals(history);
      } catch (err) {
        console.error("Init Error:", err);
      }
    };
    void initApp();

    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!pusherKey || !cluster) {
      console.error(
        "❌ PUSHER KEYS MISSING. Did you redeploy after adding Env Vars?",
      );
      return;
    }

    const pusher = new Pusher(pusherKey, {
      cluster,
      forceTLS: true,
    });

    pusher.connection.bind(
      "state_change",
      (states: { current: string; previous?: string }) => {
        console.log(`🔌 Pusher Connection State: ${states.current}`);
      },
    );

    const channel = pusher.subscribe("aether-live");

    console.log("📡 Pusher: Subscribed to 'aether-live'");

    channel.bind("new-signal", (incoming: PusherSignalPayload) => {
      const newSignal = normalizePusherSignal(incoming);
      console.log("🔥 NEW SIGNAL DETECTED:", newSignal.headline);

      setSignals((prev) => {
        const idExists = prev.some((s) => s.id === newSignal.id);
        const headlineExists = prev.some(
          (s) =>
            s.headline === newSignal.headline &&
            Math.abs(s.timestamp - newSignal.timestamp) < 5 * 60 * 1000,
        );

        if (idExists || headlineExists) {
          console.log("⏩ Skipping duplicate live signal");
          return prev;
        }

        const updated = [newSignal, ...prev].sort(
          (a, b) => b.timestamp - a.timestamp,
        );
        return updated.slice(0, SIGNALS_HISTORY_LIMIT);
      });
    });

    return () => {
      console.log("🔌 Pusher: Cleaning up connection");
      pusher.unsubscribe("aether-live");
      pusher.disconnect();
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "Escape") {
        setSelectedSignal(null);
        setIsFilterModalOpen(false);
      } else if (!isFilterModalOpen) {
        if (e.key === "1") {
          setSelectedCategory("All");
        } else if (e.key === "2") {
          setSelectedCategory("World");
        } else if (e.key === "3") {
          setSelectedCategory("Military");
        } else if (e.key === "4") {
          setSelectedCategory("Finance");
        } else if (e.key === "5") {
          setSelectedCategory("Tech");
        } else if (
          e.key === "/" ||
          (e.metaKey && e.key.toLowerCase() === "k") ||
          (e.ctrlKey && e.key.toLowerCase() === "k")
        ) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFilterModalOpen]);

  const filteredSignals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const tagNeedle =
      selectedTag === "All" ? null : selectedTag.toLowerCase();
    return signals.filter((s) => {
      if (!FEED_SOURCE_WHITELIST.has(s.source)) return false;
      const hasText =
        (s.summary && s.summary.trim() && s.summary.trim() !== "(no text)") ||
        (s.headline && s.headline.trim() && s.headline.trim() !== "(no text)");
      if (!hasText) return false;

      const categoryMatch =
        selectedCategory === "All" || s.category === selectedCategory;
      const countryMatch =
        selectedCountry === "All" || s.country === selectedCountry;

      const scopeMatch =
        selectedGeographicScope === "All" ||
        s.geographicScope === selectedGeographicScope;

      const tagMatch =
        tagNeedle === null ||
        (s.tags ?? []).some((t) => t.toLowerCase() === tagNeedle);

      if (!(categoryMatch && countryMatch && tagMatch && scopeMatch))
        return false;

      if (!q) return true;

      const hay = [
        s.headline,
        s.summary,
        s.city,
        s.country,
        s.source,
        s.adminArea ?? "",
        ...(s.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [
    signals,
    selectedCategory,
    selectedCountry,
    selectedTag,
    selectedGeographicScope,
    searchQuery,
  ]);

  useEffect(() => {
    setSelectedSignal((prev) => {
      if (!prev) return prev;
      return filteredSignals.some((s) => s.id === prev.id) ? prev : null;
    });
  }, [filteredSignals]);

  const presetAll = useCallback(() => {
    setSelectedCategory("All");
    setSelectedCountry("All");
    setSelectedTag("All");
    setSelectedGeographicScope("All");
  }, []);

  const handleSignalClick = useCallback((signal: Signal | null) => {
    setSelectedSignal(signal);
  }, []);

  const isMobile = useIsMobile();

  /** Full feed is public; admin remains staff-only at /admin. */
  const sidebarFeedUnlocked = true;

  /** True global HOT: highest impact in the 2m window across all signals, not the filtered subset. */
  const spotlightSignal = useSpotlightSignal(signals, sidebarFeedUnlocked);

  const { mode } = useSignalsColorMode();
  const isLight = mode === "light";

  return (
    <div
      className={cn(
        "flex h-[100dvh] min-h-[100dvh] w-screen max-h-[100dvh] flex-col overflow-hidden font-sans",
        isLight
          ? "bg-slate-50 text-slate-950 antialiased selection:bg-[#00BFFF]/30"
          : "bg-[#0A0A0F] text-white selection:bg-[#00BFFF]/30",
      )}
      style={
        {
          ["--signals-intel-peek" as string]: `${MOBILE_INTEL_SHEET_MIN_VISIBLE_PX}px`,
        } as CSSProperties
      }
    >
      <TopBar />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <main
          className={cn(
            "relative flex min-h-0 w-full flex-1 flex-col md:h-auto md:min-h-0",
            isLight ? "bg-slate-100" : "bg-[#050508]",
          )}
        >
          {/* Background grid effect */}
          <div
            className={cn(
              "pointer-events-none absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay",
              isLight ? "opacity-[0.14]" : "opacity-20",
            )}
          />
          <div
            className={cn(
              "pointer-events-none absolute inset-0 bg-[size:40px_40px]",
              isLight
                ? "bg-[linear-gradient(rgba(14,165,233,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.07)_1px,transparent_1px)]"
                : "bg-[linear-gradient(rgba(0,191,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,191,255,0.03)_1px,transparent_1px)]",
            )}
          />

          {/* Match visible strip above the mobile intel sheet so the globe centers like a map (peek state). */}
          <div className="relative max-md:h-[calc(100%-var(--signals-intel-peek))] min-h-0 w-full md:h-full">
            <GlobeComponent
              signals={filteredSignals}
              spotlightSignalId={spotlightSignal?.id ?? null}
              selectedSignal={selectedSignal}
              onSignalClick={handleSignalClick}
              globeStyle={globeStyle}
              uiColorMode={mode}
            />
          </div>
        </main>

        {isMobile ? (
          <MobileIntelSheet isLight={isLight}>
            <Feed
              signals={filteredSignals}
              spotlightSignal={spotlightSignal}
              onSignalClick={handleSignalClick}
              selectedSignal={selectedSignal}
              onOpenFilters={() => {
                setFilterModalInitialTab("topic");
                setIsFilterModalOpen(true);
              }}
              totalUnfilteredCount={signals.length}
              onClearFilters={presetAll}
              sidebarAccessUnlocked={sidebarFeedUnlocked}
              accessCheckPending={false}
            />
          </MobileIntelSheet>
        ) : (
          <Feed
            signals={filteredSignals}
            spotlightSignal={spotlightSignal}
            onSignalClick={handleSignalClick}
            selectedSignal={selectedSignal}
            onOpenFilters={() => {
              setFilterModalInitialTab("topic");
              setIsFilterModalOpen(true);
            }}
            totalUnfilteredCount={signals.length}
            onClearFilters={presetAll}
            sidebarAccessUnlocked={sidebarFeedUnlocked}
            accessCheckPending={false}
          />
        )}
      </div>

      {/* Reserve space for fixed bottom bar + safe area */}
      <div
        className="shrink-0"
        style={{
          height: "calc(5.75rem + env(safe-area-inset-bottom, 0px))",
        }}
        aria-hidden
      />

      <BottomBar
        globeStyle={globeStyle}
        setGlobeStyle={setGlobeStyle}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filteredCount={filteredSignals.length}
        totalCount={signals.length}
        onOpenFilters={() => {
          setFilterModalInitialTab("topic");
          setIsFilterModalOpen(true);
        }}
        searchInputRef={searchInputRef}
      />

      <KindJoeWatchAccountNudge />

      {isFilterModalOpen && (
        <FilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          initialTab={filterModalInitialTab}
          selectedCategory={selectedCategory}
          signals={signals}
          setSelectedCategory={setSelectedCategory}
          selectedCountry={selectedCountry}
          setSelectedCountry={setSelectedCountry}
          selectedTag={selectedTag}
          setSelectedTag={(t) =>
            setSelectedTag(t === "All" ? "All" : t.toLowerCase())
          }
          selectedGeographicScope={selectedGeographicScope}
          setSelectedGeographicScope={setSelectedGeographicScope}
        />
      )}

    </div>
  );
}
