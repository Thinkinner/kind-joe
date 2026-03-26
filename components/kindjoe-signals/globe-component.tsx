"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Globe from "react-globe.gl";
import { Signal } from "@/lib/aggregator/types";
import { X, Target, MapPin, Activity, Hash } from "lucide-react";
import {
  formatLatLng,
  macroRegionForCountry,
} from "@/lib/signals/macro-region";

const DARK_GLOBE_TEXTURE =
  "https://unpkg.com/three-globe@2.32.0/example/img/earth-dark.jpg";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function signalPointTooltip(d: Signal) {
  const region = macroRegionForCountry(d.country);
  const coords = formatLatLng(d.lat, d.lng);
  return `<div style="font-family:ui-monospace,monospace;font-size:11px;max-width:260px;background:rgba(3,3,6,0.95);padding:10px 12px;border:1px solid rgba(220,38,38,0.45);border-radius:6px;color:#e5e5e5;line-height:1.45;box-shadow:0 8px 32px rgba(0,0,0,0.65)">
    <div style="color:#f87171;font-weight:800;font-size:10px;letter-spacing:0.12em;margin-bottom:6px">SIGNAL</div>
    <div style="font-weight:700;color:#fff;margin-bottom:8px;font-size:12px">${escapeHtml(d.headline.slice(0, 140))}${d.headline.length > 140 ? "…" : ""}</div>
    <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:8px;display:grid;gap:4px;font-size:10px">
      <div><span style="color:#9ca3af">City / locality</span> · <span style="color:#f3f4f6">${escapeHtml(d.city)}</span></div>
      <div><span style="color:#9ca3af">Country</span> · <span style="color:#f3f4f6">${escapeHtml(d.country)}</span></div>
      <div><span style="color:#9ca3af">Region</span> · <span style="color:#f3f4f6">${escapeHtml(region)}</span></div>
      <div><span style="color:#9ca3af">Sector</span> · <span style="color:#f3f4f6">${escapeHtml(d.category)}</span></div>
      <div><span style="color:#9ca3af">Coordinates</span> · <span style="color:#fca5a5">${escapeHtml(coords)}</span></div>
      <div><span style="color:#9ca3af">Impact</span> · <span style="color:#f3f4f6">${d.impactScore}</span></div>
    </div>
  </div>`;
}

function countryPolygonTooltip(feature: {
  properties?: Record<string, unknown>;
}) {
  const p = feature.properties ?? {};
  const name = String(p.NAME ?? p.ADMIN ?? "Area");
  const continent = String(p.CONTINENT ?? "—");
  const iso = String(p.ISO_A2 ?? p.ADM0_A3 ?? "—");
  const pop = p.POP_EST != null ? Number(p.POP_EST).toLocaleString() : null;
  return `<div style="font-family:ui-monospace,monospace;font-size:11px;min-width:200px;max-width:280px;background:rgba(3,3,6,0.95);padding:10px 12px;border:1px solid rgba(120,120,130,0.5);border-radius:6px;color:#e5e5e5;line-height:1.5">
    <div style="color:#94a3b8;font-size:9px;letter-spacing:0.15em;margin-bottom:6px">TERRITORY</div>
    <div style="font-weight:800;color:#fff;margin-bottom:8px;font-size:13px">${escapeHtml(name)}</div>
    <div style="display:grid;gap:4px;font-size:10px;border-top:1px solid rgba(255,255,255,0.08);padding-top:8px">
      <div><span style="color:#9ca3af">Continent</span> · <span style="color:#e5e7eb">${escapeHtml(continent)}</span></div>
      <div><span style="color:#9ca3af">ISO</span> · <span style="color:#e5e7eb">${escapeHtml(iso)}</span></div>
      ${pop ? `<div><span style="color:#9ca3af">Population (est.)</span> · <span style="color:#e5e7eb">${pop}</span></div>` : ""}
    </div>
  </div>`;
}

interface GlobeComponentProps {
  signals: Signal[];
  selectedSignal: Signal | null;
  onSignalClick: (signal: Signal | null) => void;
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

export default function GlobeComponent(props: GlobeComponentProps) {
  const { signals, selectedSignal, onSignalClick } = props;
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

  const labelsData = useMemo(() => {
    return signals.map((s) => ({
      ...s,
      labelName: `${s.city.toUpperCase()}\n${s.country.toUpperCase()}\n${macroRegionForCountry(s.country).toUpperCase()}`,
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
      className="relative h-full w-full overflow-hidden bg-[#020203] font-mono"
    >
      {/* 📡 HUD OVERLAY: ACTIVE COORDINATES */}
      {selectedSignal && (
        <div className="absolute top-16 right-4 md:top-20 md:right-8 z-30 flex flex-col items-end pointer-events-none animate-pulse">
          <span className="text-[8px] md:text-[9px] text-gray-500 tracking-[0.3em]">
            GPS_LOCK_CONFIRMED
          </span>
          <span
            className="text-[10px] md:text-xs font-bold tracking-widest text-white"
            style={{ color: activeColor }}
          >
            {formatLatLng(selectedSignal.lat, selectedSignal.lng)}
          </span>
          <span className="mt-1 max-w-[14rem] text-right text-[9px] leading-snug text-gray-500">
            {selectedSignal.city} · {selectedSignal.country} ·{" "}
            {macroRegionForCountry(selectedSignal.country)}
          </span>
        </div>
      )}

      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl={DARK_GLOBE_TEXTURE}
        backgroundColor="rgba(2,2,3,0.96)"
        showGraticules={true}
        showAtmosphere={true}
        atmosphereColor="rgba(40, 10, 12, 0.35)"
        atmosphereAltitude={0.12}
        polygonsData={geoData.features}
        polygonCapColor={(d: any) => {
          const name = d.properties.NAME;
          const target = selectedSignal?.country;
          const mappedName = COUNTRY_NAME_MAP[target || ""] || target;
          if (selectedSignal && name === mappedName) {
            return getImpactColor(selectedSignal.impactScore, 0.22);
          }
          return "rgba(6, 6, 10, 0.88)";
        }}
        polygonSideColor={() => "rgba(0, 0, 0, 0)"}
        polygonStrokeColor={(d: any) => {
          const name = d.properties.NAME;
          const target = selectedSignal?.country;
          const mappedName = COUNTRY_NAME_MAP[target || ""] || target;
          if (selectedSignal && name === mappedName) {
            return getImpactColor(selectedSignal.impactScore, 0.55);
          }
          return "rgba(90, 90, 102, 0.35)";
        }}
        polygonLabel={(d: any) => countryPolygonTooltip(d)}
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
        pointLabel={(d: any) => signalPointTooltip(d as Signal)}
        labelsData={labelsData}
        labelLat="lat"
        labelLng="lng"
        labelText="labelName"
        labelAltitude={0.02}
        labelSize={(d: any) => (d.id === selectedSignal?.id ? 0.95 : 0.35)}
        labelColor={(d: any) =>
          d.id === selectedSignal?.id
            ? getImpactColor(d.impactScore)
            : "rgba(220, 220, 228, 0.55)"
        }
        labelDotRadius={0.35}
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
              type="button"
              onClick={() => onSignalClick(null)}
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
                type="button"
                onClick={() => onSignalClick(null)}
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
                  {selectedSignal.city} · {selectedSignal.country}
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

            <div className="space-y-4 md:space-y-4 mb-8 md:mb-8">
              <div className="flex items-center gap-2 text-[10px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest border-b border-white/5 pb-2">
                Situational Summary
              </div>
              <p className="text-[13px] md:text-[13px] text-gray-300 leading-relaxed font-medium">
                {selectedSignal.summary}
              </p>

              {/* Read full article — disabled for now.
                  To restore: import useSignalArticlePublish + Newspaper, Loader2; call
                  const { status, error, cachedSlug, publishOrOpen } = useSignalArticlePublish(selectedSignal);
              <button
                type="button"
                onClick={() => void publishOrOpen()}
                disabled={status === "loading"}
                className="flex w-full items-center justify-center gap-2 rounded-sm border px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  borderColor: `${activeColor}55`,
                  backgroundColor: `${activeColor}18`,
                  color: activeColor,
                }}
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    Building article…
                  </>
                ) : (
                  <>
                    <Newspaper className="h-4 w-4 shrink-0" />
                    {cachedSlug ? "Open full article" : "Read full article"}
                  </>
                )}
              </button>

              {status === "error" && error && (
                <p className="text-[11px] text-red-400/90 leading-snug">
                  {error}
                </p>
              )}
              */}
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
