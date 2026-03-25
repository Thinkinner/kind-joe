"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import TopBar from "@/components/kindjoe-signals/top-bar";
import Feed from "@/components/kindjoe-signals/feed";
import BottomBar from "@/components/kindjoe-signals/bottom-bar";
import FilterModal from "@/components/kindjoe-signals/filter-modal";
import { Signal, Category } from "@/lib/aggregator/types";
import Pusher from "pusher-js";
import { getHistory, triggerSync } from "@/lib/actions/news-signal";

// Dynamically import GlobeComponent to avoid SSR issues with react-globe.gl
const GlobeComponent = dynamic(
  () => import("@/components/kindjoe-signals/globe-component"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#0A0A0F]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-8 w-8">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00BFFF] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-8 w-8 bg-[#00BFFF]"></span>
          </div>
          <span className="font-mono text-[#00BFFF] text-sm tracking-widest animate-pulse">
            INITIALIZING AETHER...
          </span>
        </div>
      </div>
    ),
  },
);

export default function Home() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const signalsRef = useRef<Signal[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | "All">(
    "All",
  );
  const [selectedCountry, setSelectedCountry] = useState<string | "All">("All");
  const [selectedTag, setSelectedTag] = useState<string | "All">("All");
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [tension, setTension] = useState(20);
  const [globeStyle, setGlobeStyle] = useState<
    "realistic" | "dark" | "wireframe"
  >("dark");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

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

  // Keep ref updated for intervals
  useEffect(() => {
    signalsRef.current = signals;
  }, [signals]);

  // Mock data generator
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
    initApp();

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

    // --- DEBUG LOGS FOR CONNECTION ---
    pusher.connection.bind("state_change", (states: any) => {
      console.log(`🔌 Pusher Connection State: ${states.current}`);
    });

    const channel = pusher.subscribe("aether-live");

    console.log("📡 Pusher: Subscribed to 'aether-live'");

    channel.bind("new-signal", (newSignal: Signal) => {
      console.log("🔥 NEW SIGNAL DETECTED:", newSignal.headline);

      setSignals((prev) => {
        // 🛡️ DEDUPLICATION
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
  }, []); // Keeps strictly to mount-only

  // Tension decay based on signal density
  useEffect(() => {
    const decayInterval = setInterval(() => {
      const now = Date.now();
      // Count high impact signals in the last 15 seconds
      const recentHighImpactSignals = signalsRef.current.filter(
        (s) => s.impactScore > 50 && now - s.timestamp < 15000,
      );
      const density = recentHighImpactSignals.length;

      setTension((prev) => {
        if (prev <= 0) return 0;

        // Base decay rate per second
        let decayRate = 1.0;

        // Adjust decay rate based on density (more signals = slower decay)
        if (density >= 3) decayRate = 0.1;
        else if (density === 2) decayRate = 0.3;
        else if (density === 1) decayRate = 0.6;
        else decayRate = 1.5; // No recent high impact signals, fast decay

        return Math.max(0, prev - decayRate);
      });
    }, 1000);

    return () => clearInterval(decayInterval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedSignal(null);
        setIsFilterModalOpen(false);
      } else if (e.key === "1") {
        setSelectedCategory("All");
      } else if (e.key === "2") {
        setSelectedCategory("Geopolitics");
      } else if (e.key === "3") {
        setSelectedCategory("Conflicts & Wars");
      } else if (e.key === "4") {
        setSelectedCategory("Economy & Markets");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredSignals = useMemo(() => {
    return signals.filter((s) => {
      // 1. Remove any strict "5-minute" hide logic here.
      // We want the aggregator to handle freshness, but the UI to show the history.

      const categoryMatch =
        selectedCategory === "All" || s.category === selectedCategory;
      const countryMatch =
        selectedCountry === "All" || s.country === selectedCountry;

      // Tag filter
      const tagMatch =
        selectedTag === "All" ||
        (s.tags && s.tags.includes(selectedTag.toLowerCase()));

      return categoryMatch && countryMatch && tagMatch;
    });
  }, [signals, selectedCategory, selectedCountry, selectedTag]);

  const handleSignalClick = useCallback((signal: Signal) => {
    setSelectedSignal(signal);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0A0A0F] text-white overflow-hidden font-sans selection:bg-[#00BFFF]/30">
      <TopBar
        tension={tension}
        setTension={setTension}
        signalCount={signals.length}
      />

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
        <main className="relative bg-[#050508] h-[35vh] shrink-0 md:h-auto md:flex-1">
          {/* Background grid effect */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,191,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,191,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

          <GlobeComponent
            signals={filteredSignals}
            selectedSignal={selectedSignal}
            onSignalClick={handleSignalClick}
            globeStyle={globeStyle}
          />
        </main>

        <Feed
          signals={filteredSignals}
          onSignalClick={handleSignalClick}
          selectedSignal={selectedSignal}
          onOpenFilters={() => setIsFilterModalOpen(true)}
        />
      </div>

      <BottomBar globeStyle={globeStyle} setGlobeStyle={setGlobeStyle} />

      {isFilterModalOpen && (
        <FilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          selectedCategory={selectedCategory}
          signals={filteredSignals} // Pass the data here!
          setSelectedCategory={setSelectedCategory}
          selectedCountry={selectedCountry}
          setSelectedCountry={setSelectedCountry}
          selectedTag={selectedTag}
          setSelectedTag={setSelectedTag}
        />
      )}
    </div>
  );
}
