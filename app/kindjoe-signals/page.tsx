"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import Pusher from "pusher-js";
import { motion, useAnimation, useDragControls } from "framer-motion";
import TopBar from "@/components/kindjoe-signals/top-bar";
import Feed from "@/components/kindjoe-signals/feed";
import BottomBar from "@/components/kindjoe-signals/bottom-bar";
import FilterModal from "@/components/kindjoe-signals/filter-modal";
import SignalsAccessGate from "@/components/kindjoe-signals/signals-access-gate";
import {
  Signal,
  Category,
  Source,
  type GeographicScope,
  type PusherSignalPayload,
} from "@/lib/aggregator/types";
import {
  getHistory,
  triggerSync,
  checkSignalsAccess,
} from "@/lib/actions/news-signal";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useSignalsColorMode } from "@/components/kindjoe-signals/signals-color-mode";

const SOURCE_SET = new Set<Source>(["X", "Telegram", "Discord", "RSS"]);
const CATEGORY_SET = new Set<Category>([
  "Geopolitics",
  "Conflicts & Wars",
  "Economy & Markets",
  "Business",
  "Tech & Science",
  "Disasters & Emergencies",
  "Viral / Social",
]);

/** Coerces live Pusher payloads into a full Signal (missing geo fields + legacy events). */
function normalizePusherSignal(raw: PusherSignalPayload): Signal {
  const g = raw.geographicScope;
  const scope: GeographicScope =
    g === "local" || g === "regional" || g === "national" || g === "global"
      ? g
      : "global";

  const source: Source =
    raw.source !== undefined && SOURCE_SET.has(raw.source) ? raw.source : "RSS";

  const category: Category =
    raw.category !== undefined && CATEGORY_SET.has(raw.category)
      ? raw.category
      : "Geopolitics";

  return {
    id: raw.id,
    headline: raw.headline,
    summary: raw.summary ?? "",
    source,
    category,
    lat: raw.lat,
    lng: raw.lng,
    city: raw.city ?? "Unknown",
    country: raw.country ?? "Unknown",
    geographicScope: scope,
    adminArea: raw.adminArea ?? "",
    impactScore: raw.impactScore,
    timestamp: raw.timestamp,
    tags: raw.tags ?? [],
  };
}

function GlobeLoadingFallback() {
  const { mode } = useSignalsColorMode();
  const isLight = mode === "light";
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center",
        isLight ? "bg-slate-200" : "bg-[#0A0A0F]",
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
  const [signalsAccessChecked, setSignalsAccessChecked] = useState(false);
  const [hasSignalsAccess, setHasSignalsAccess] = useState(false);
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
  const [leadModalOpen, setLeadModalOpen] = useState(false);

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
    let cancelled = false;
    (async () => {
      try {
        const ok = await checkSignalsAccess();
        if (!cancelled) {
          setHasSignalsAccess(ok);
        }
      } catch {
        if (!cancelled) {
          setHasSignalsAccess(false);
        }
      } finally {
        if (!cancelled) {
          setSignalsAccessChecked(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        const history = await getHistory();
        setSignals(history);
        await triggerSync();
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
        return updated.slice(0, 50);
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
          setSelectedCategory("Geopolitics");
        } else if (e.key === "3") {
          setSelectedCategory("Conflicts & Wars");
        } else if (e.key === "4") {
          setSelectedCategory("Economy & Markets");
        } else if (e.key === "5") {
          setSelectedCategory("Business");
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
  const controls = useAnimation();
  const sheetDragControls = useDragControls();

  const onSheetDragEnd = useCallback(
    (
      _event: MouseEvent | TouchEvent | PointerEvent,
      info: {
        offset: { y: number };
        velocity: { y: number };
        point: { y: number };
      },
    ) => {
      const shouldExpand = info.offset.y < -100 || info.velocity.y < -500;
      const shouldMinimize = info.offset.y > 100 || info.velocity.y > 500;

      if (shouldExpand) {
        void controls.start("expanded");
      } else if (shouldMinimize) {
        void controls.start("minimized");
      } else {
        void controls.start(
          info.point.y < window.innerHeight / 2 ? "expanded" : "minimized",
        );
      }
    },
    [controls],
  );

  const sidebarFeedUnlocked = signalsAccessChecked && hasSignalsAccess;

  const { mode } = useSignalsColorMode();
  const isLight = mode === "light";

  return (
    <div
      className={cn(
        "flex h-screen w-screen flex-col overflow-hidden font-sans",
        isLight
          ? "bg-slate-100 text-slate-900 selection:bg-[#00BFFF]/25"
          : "bg-[#0A0A0F] text-white selection:bg-[#00BFFF]/30",
      )}
    >
      <TopBar />

      <div className="relative flex flex-1 flex-col overflow-hidden md:flex-row">
        <main
          className={cn(
            "relative h-full w-full shrink-0 md:h-auto md:flex-1",
            isLight ? "bg-slate-200/90" : "bg-[#050508]",
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

          <GlobeComponent
            signals={filteredSignals}
            selectedSignal={selectedSignal}
            onSignalClick={handleSignalClick}
            globeStyle={globeStyle}
            uiColorMode={mode}
          />
        </main>

        {isMobile ? (
          <motion.div
            initial="minimized"
            animate={controls}
            variants={{
              expanded: { y: "0%" },
              minimized: { y: "calc(100% - 60px)" },
            }}
            transition={{
              type: "tween",
              duration: 0.22,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            drag="y"
            dragControls={sheetDragControls}
            dragListener={false}
            dragMomentum={false}
            dragElastic={0.08}
            dragTransition={{ bounceStiffness: 400, bounceDamping: 35 }}
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={onSheetDragEnd}
            style={{ willChange: "transform" }}
            className={cn(
              "fixed inset-x-0 bottom-11 z-50 flex h-[80dvh] max-h-[calc(100dvh-7rem)] flex-col border-t [transform:translateZ(0)]",
              isLight
                ? "border-slate-200 bg-slate-50 shadow-[0_-12px_40px_rgba(15,23,42,0.1)]"
                : "border-white/10 bg-[#0A0A0F] shadow-[0_-20px_50px_rgba(0,0,0,0.8)]",
            )}
          >
            <div
              className={cn(
                "flex min-h-[52px] shrink-0 cursor-grab touch-none flex-col items-center justify-center gap-2 py-3 active:cursor-grabbing",
                isLight ? "bg-slate-50" : "bg-[#0A0A0F]",
              )}
              onPointerDown={(e) => sheetDragControls.start(e)}
            >
              <div
                className={cn(
                  "h-1.5 w-12 rounded-full",
                  isLight ? "bg-slate-300" : "bg-white/20",
                )}
              />
              <div
                className={cn(
                  "pointer-events-none text-[8px] font-bold uppercase tracking-[0.2em]",
                  isLight ? "text-slate-500" : "text-gray-600",
                )}
              >
                Drag Intel Dossier
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden overscroll-y-contain">
              <Feed
                signals={filteredSignals}
                onSignalClick={handleSignalClick}
                selectedSignal={selectedSignal}
                onOpenFilters={() => {
                  setFilterModalInitialTab("topic");
                  setIsFilterModalOpen(true);
                }}
                totalUnfilteredCount={signals.length}
                onClearFilters={presetAll}
                sidebarAccessUnlocked={sidebarFeedUnlocked}
                accessCheckPending={!signalsAccessChecked}
                onOpenUnlockModal={() => setLeadModalOpen(true)}
                mapSignalCount={filteredSignals.length}
              />
            </div>
          </motion.div>
        ) : (
          <Feed
            signals={filteredSignals}
            onSignalClick={handleSignalClick}
            selectedSignal={selectedSignal}
            onOpenFilters={() => {
              setFilterModalInitialTab("topic");
              setIsFilterModalOpen(true);
            }}
            totalUnfilteredCount={signals.length}
            onClearFilters={presetAll}
            sidebarAccessUnlocked={sidebarFeedUnlocked}
            accessCheckPending={!signalsAccessChecked}
            onOpenUnlockModal={() => setLeadModalOpen(true)}
            mapSignalCount={filteredSignals.length}
          />
        )}
      </div>

      {/* Reserve space for fixed bottom bar + safe area */}
      <div
        className="shrink-0"
        style={{
          height: "calc(2.75rem + env(safe-area-inset-bottom, 0px))",
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

      <SignalsAccessGate
        open={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        onAccessGranted={() => {
          setHasSignalsAccess(true);
          setLeadModalOpen(false);
        }}
      />
    </div>
  );
}
