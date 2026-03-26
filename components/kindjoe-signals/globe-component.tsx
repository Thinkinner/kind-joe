"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Globe from "react-globe.gl";
import { Signal } from "@/lib/aggregator/types";
import {
  X,
  Target,
  MapPin,
  Activity,
  Hash,
  ShieldAlert,
  Zap,
} from "lucide-react";

interface GlobeComponentProps {
  signals: Signal[];
  selectedSignal: Signal | null;
  onSignalClick: (signal: Signal) => void;
  globeStyle: "realistic" | "dark" | "wireframe";
}

// Impact color logic
const getImpactColor = (score: number, opacity: number = 1) => {
  if (score >= 85) return `rgba(239, 68, 68, ${opacity})`; // Red (Critical)
  if (score >= 60) return `rgba(245, 158, 11, ${opacity})`; // Orange (High)
  if (score >= 30) return `rgba(0, 191, 255, ${opacity})`; // Cyan (Moderate)
  return `rgba(16, 185, 129, ${opacity})`; // Green (Nominal)
};

const COUNTRY_NAME_MAP: Record<string, string> = {
  USA: "United States of America",
  UK: "United Kingdom",
  UAE: "United Arab Emirates",
  Russia: "Russian Federation",
};

export default function GlobeComponent({
  signals,
  selectedSignal,
  onSignalClick,
}: GlobeComponentProps) {
  const globeRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [geoData, setGeoData] = useState({ features: [] });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson",
    )
      .then((res) => res.json())
      .then(setGeoData);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 🏷️ Labels for all points
  const labelsData = useMemo(() => {
    return signals.map((s) => ({
      ...s,
      labelName: s.city.toUpperCase(),
    }));
  }, [signals]);

  // 🔭 Zoom to Local or Global scale based on news type
  useEffect(() => {
    if (selectedSignal && globeRef.current) {
      // If impact is low, it's likely local news, so we zoom in closer (altitude 0.8)
      const zoomAltitude = selectedSignal.impactScore < 40 ? 0.8 : 1.6;
      globeRef.current.pointOfView(
        {
          lat: selectedSignal.lat,
          lng: selectedSignal.lng,
          altitude: zoomAltitude,
        },
        1000,
      );
    }
  }, [selectedSignal]);

  const activeColor = selectedSignal
    ? getImpactColor(selectedSignal.impactScore)
    : "#00BFFF";

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative bg-[#050508] overflow-hidden font-mono"
    >
      {/* 📡 HUD OVERLAY: ACTIVE COORDINATES */}
      {selectedSignal && (
        <div className="absolute top-16 right-4 md:top-20 md:right-8 z-30 flex flex-col items-end pointer-events-none animate-pulse">
          <span className="text-[8px] md:text-[9px] text-gray-500 tracking-[0.3em]">
            GPS_LOCK_CONFIRMED
          </span>
          <span
            className="text-[10px] md:text-xs text-white font-bold tracking-widest"
            style={{ color: activeColor }}
          >
            {selectedSignal.lat.toFixed(4)}°N / {selectedSignal.lng.toFixed(4)}
            °W
          </span>
        </div>
      )}

      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="rgba(0,0,0,0)"
        showAtmosphere={true}
        atmosphereColor={activeColor}
        atmosphereAltitude={0.2}
        // --- 🗺️ AREA MARKING (COUNTRY) ---
        polygonsData={geoData.features}
        polygonCapColor={(d: any) => {
          const name = d.properties.NAME;
          const target = selectedSignal?.country;
          const mappedName = COUNTRY_NAME_MAP[target || ""] || target;
          return name === mappedName
            ? getImpactColor(selectedSignal!.impactScore, 0.15)
            : "rgba(0,0,0,0)";
        }}
        polygonSideColor={() => "rgba(0, 0, 0, 0)"}
        polygonStrokeColor={(d: any) => {
          const name = d.properties.NAME;
          const target = selectedSignal?.country;
          const mappedName = COUNTRY_NAME_MAP[target || ""] || target;
          return name === mappedName
            ? getImpactColor(selectedSignal!.impactScore, 0.6)
            : "rgba(255, 255, 255, 0.02)";
        }}
        // --- 🎯 HYPER-LOCAL MARKING (SECTOR HIGHLIGHT) ---
        ringsData={selectedSignal ? [selectedSignal] : []}
        ringLat="lat"
        ringLng="lng"
        ringColor={(d: any) => getImpactColor(d.impactScore)}
        ringMaxRadius={(d: any) => (d.impactScore < 40 ? 3 : 12)} // Smaller ring for local news
        ringPropagationSpeed={2.5}
        ringRepeatPeriod={800}
        // --- 📍 SIGNAL POINTS ---
        pointsData={signals}
        pointLat="lat"
        pointLng="lng"
        pointColor={(d: any) => getImpactColor(d.impactScore)}
        pointAltitude={0.01}
        pointRadius={(d: any) => (d.id === selectedSignal?.id ? 1.5 : 0.7)}
        // --- 🏷️ LABELS ---
        labelsData={labelsData}
        labelLat="lat"
        labelLng="lng"
        labelText="labelName"
        labelSize={(d: any) => (d.id === selectedSignal?.id ? 1.2 : 0.4)}
        labelColor={(d: any) =>
          d.id === selectedSignal?.id
            ? getImpactColor(d.impactScore)
            : "rgba(255,255,255,0.4)"
        }
        onLabelClick={(label: any) => onSignalClick(label)}
      />

      {/* 📂 TACTICAL DOSSIER (FULLSCREEN MOBILE / SIDEBAR DESKTOP) */}
      {selectedSignal && (
        <div className="fixed inset-0 z-[100] md:absolute md:inset-auto md:top-6 md:left-6 md:bottom-6 md:w-96 bg-[#0A0A0F]/95 md:bg-[#0A0A0F]/85 backdrop-blur-3xl md:border border-white/10 flex flex-col shadow-[20px_0_60px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 md:zoom-in-100 md:slide-in-from-left duration-300 md:duration-500">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: activeColor }}
              />
              <span className="text-[10px] text-gray-400 font-black tracking-[0.3em] uppercase">
                Dossier_Lock_Active
              </span>
            </div>
            <button
              onClick={() => onSignalClick(null as any)}
              className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div
            className="h-[2px] w-full shadow-lg shrink-0"
            style={{
              backgroundColor: activeColor,
              boxShadow: `0 0 20px ${activeColor}`,
            }}
          />

          <div className="p-7 md:p-7 flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start mb-8">
              <div className="space-y-1.5">
                <div
                    className="flex items-center gap-2"
                    style={{ color: activeColor }}
                  >
                    <Target className="w-4 h-4 md:w-4 md:h-4 animate-pulse" />
                    <span className="text-[11px] md:text-[11px] font-black tracking-[0.25em] uppercase">
                      {selectedSignal.impactScore < 40
                        ? "Local Asset Identified"
                        : "Strategic Signal Locked"}
                    </span>
                  </div>
                <div className="text-[9px] md:text-[9px] text-gray-500 tracking-widest uppercase">
                  ID: {selectedSignal.id.slice(0, 12)}
                </div>
              </div>
              <button
                onClick={() => onSignalClick(null as any)}
                className="hidden md:block p-1.5 hover:bg-white/10 rounded-full text-gray-500 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <h2
              className="text-xl md:text-xl font-bold text-white mb-6 md:mb-6 leading-[1.2] tracking-tight border-l-2 pl-4 italic"
              style={{ borderLeftColor: activeColor }}
            >
              {selectedSignal.headline}
            </h2>

            <div className="flex flex-wrap gap-2.5 md:gap-2.5 mb-8 md:mb-8">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-[#00BFFF]/20 bg-[#00BFFF]/5">
                <MapPin className="w-3 h-3 md:w-3 md:h-3 text-[#00BFFF]" />
                <span className="text-[10px] md:text-[10px] text-[#00BFFF] font-black uppercase">
                  {selectedSignal.city} // {selectedSignal.country}
                </span>
              </div>
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-sm border"
                style={{
                  backgroundColor: getImpactColor(
                    selectedSignal.impactScore,
                    0.1,
                  ),
                  borderColor: getImpactColor(selectedSignal.impactScore, 0.3),
                }}
              >
                <Activity className="w-3 h-3 md:w-3 md:h-3" style={{ color: activeColor }} />
                <span
                  className="text-[10px] md:text-[10px] uppercase font-black"
                  style={{ color: activeColor }}
                >
                  IMPACT: {selectedSignal.impactScore}
                </span>
              </div>
            </div>

            <div className="space-y-4 md:space-y-4 mb-10 md:mb-10">
              <div className="flex items-center gap-2 text-[10px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest border-b border-white/5 pb-2">
                Situational Summary
              </div>
              <p className="text-[13px] md:text-[13px] text-gray-300 leading-relaxed font-medium">
                {selectedSignal.summary}
              </p>
            </div>

            <div className="space-y-4 md:space-y-4 mb-10 md:mb-10">
              <div className="text-[10px] md:text-[10px] text-gray-600 uppercase font-bold tracking-widest flex items-center gap-2">
                <Hash className="w-3 h-3 md:w-3 md:h-3" /> Pattern Match
              </div>
              <div className="flex flex-wrap gap-2">
                {(selectedSignal.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] md:text-[9px] font-black px-2.5 py-1 bg-white/5 border border-white/10 text-gray-400 hover:text-white uppercase"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* 📍 LOCAL SPECIFICS */}
            <div className="grid grid-cols-2 gap-6 md:gap-6 border-t border-white/10 pt-8 md:pt-8">
              <div className="space-y-1.5">
                <div className="text-[9px] md:text-[9px] text-gray-600 uppercase tracking-tighter font-bold">
                  Operational Scale
                </div>
                <div className="text-[11px] md:text-[11px] text-white font-black uppercase">
                  {selectedSignal.impactScore < 40
                    ? "Tactical_Local"
                    : selectedSignal.impactScore < 75
                      ? "National_Strategic"
                      : "Global_Surveillance"}
                </div>
              </div>
              <div className="space-y-1.5 text-right">
                <div className="text-[9px] md:text-[9px] text-gray-600 uppercase tracking-tighter font-bold">
                  Sector
                </div>
                <div className="text-[11px] md:text-[11px] font-black uppercase text-white">
                  {selectedSignal.category}
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 md:p-5 border-t border-white/5 bg-white/5 flex justify-between items-center text-[9px] md:text-[9px] text-gray-600 tracking-[0.3em] uppercase">
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full animate-ping"
                style={{ backgroundColor: activeColor }}
              />
              <span>Live_Stream_Active</span>
            </div>
            <span>KindJoe.SYS</span>
          </div>
        </div>
      )}
    </div>
  );
}
