"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Globe from "react-globe.gl";
import { Signal } from "@/lib/aggregator/types";
import { X, Target, MapPin, Activity, Hash } from "lucide-react";
import {
  formatLatLng,
  macroRegionForCountry,
} from "@/lib/signals/macro-region";
import { cn } from "@/lib/utils";
import type { SignalsColorMode } from "@/components/kindjoe-signals/signals-color-mode";

const DARK_GLOBE_TEXTURE =
  "https://unpkg.com/three-globe@2.32.0/example/img/earth-dark.jpg";
const REALISTIC_GLOBE_TEXTURE =
  "https://unpkg.com/three-globe@2.32.0/example/img/earth-blue-marble.jpg";
const WIREFRAME_GLOBE_TEXTURE =
  "https://unpkg.com/three-globe@2.32.0/example/img/earth-topology.png";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function signalPointTooltip(d: Signal, mode: SignalsColorMode) {
  const region = macroRegionForCountry(d.country);
  const coords = formatLatLng(d.lat, d.lng);
  const isLight = mode === "light";
  const panelBg = isLight ? "rgba(255,255,255,0.98)" : "rgba(3,3,6,0.95)";
  const border = isLight
    ? "1px solid rgba(220,38,38,0.35)"
    : "1px solid rgba(220,38,38,0.45)";
  const shadow = isLight
    ? "0 8px 32px rgba(15,23,42,0.12)"
    : "0 8px 32px rgba(0,0,0,0.65)";
  const headlineColor = isLight ? "#0f172a" : "#fff";
  const muted = isLight ? "#64748b" : "#9ca3af";
  const value = isLight ? "#1e293b" : "#f3f4f6";
  const divider = isLight ? "1px solid rgba(15,23,42,0.08)" : "1px solid rgba(255,255,255,0.08)";
  return `<div style="font-family:ui-monospace,monospace;font-size:11px;max-width:260px;background:${panelBg};padding:10px 12px;border:${border};border-radius:6px;color:${isLight ? "#334155" : "#e5e5e5"};line-height:1.45;box-shadow:${shadow}">
    <div style="color:#dc2626;font-weight:800;font-size:10px;letter-spacing:0.12em;margin-bottom:6px">SIGNAL</div>
    <div style="font-weight:700;color:${headlineColor};margin-bottom:8px;font-size:12px">${escapeHtml(d.headline.slice(0, 140))}${d.headline.length > 140 ? "…" : ""}</div>
    <div style="border-top:${divider};padding-top:8px;display:grid;gap:4px;font-size:10px">
      <div><span style="color:${muted}">City / locality</span> · <span style="color:${value}">${escapeHtml(d.city)}</span></div>
      <div><span style="color:${muted}">Country</span> · <span style="color:${value}">${escapeHtml(d.country)}</span></div>
      <div><span style="color:${muted}">Region</span> · <span style="color:${value}">${escapeHtml(region)}</span></div>
      <div><span style="color:${muted}">Sector</span> · <span style="color:${value}">${escapeHtml(d.category)}</span></div>
      <div><span style="color:${muted}">Coordinates</span> · <span style="color:#dc2626">${escapeHtml(coords)}</span></div>
      <div><span style="color:${muted}">Impact</span> · <span style="color:${value}">${d.impactScore}</span></div>
    </div>
  </div>`;
}

function countryPolygonTooltip(
  feature: { properties?: Record<string, unknown> },
  mode: SignalsColorMode,
) {
  const p = feature.properties ?? {};
  const name = String(p.NAME ?? p.ADMIN ?? "Area");
  const continent = String(p.CONTINENT ?? "—");
  const iso = String(p.ISO_A2 ?? p.ADM0_A3 ?? "—");
  const pop = p.POP_EST != null ? Number(p.POP_EST).toLocaleString() : null;
  const isLight = mode === "light";
  const panelBg = isLight ? "rgba(255,255,255,0.98)" : "rgba(3,3,6,0.95)";
  const border = isLight
    ? "1px solid rgba(148,163,184,0.55)"
    : "1px solid rgba(120,120,130,0.5)";
  const shadow = isLight
    ? "0 8px 24px rgba(15,23,42,0.1)"
    : "0 8px 24px rgba(0,0,0,0.5)";
  const titleMuted = isLight ? "#64748b" : "#94a3b8";
  const headline = isLight ? "#0f172a" : "#fff";
  const divider = isLight ? "1px solid rgba(15,23,42,0.08)" : "1px solid rgba(255,255,255,0.08)";
  const label = isLight ? "#64748b" : "#9ca3af";
  const val = isLight ? "#334155" : "#e5e7eb";
  return `<div style="font-family:ui-monospace,monospace;font-size:11px;min-width:200px;max-width:280px;background:${panelBg};padding:10px 12px;border:${border};border-radius:6px;color:${isLight ? "#475569" : "#e5e5e5"};line-height:1.5;box-shadow:${shadow}">
    <div style="color:${titleMuted};font-size:9px;letter-spacing:0.15em;margin-bottom:6px">TERRITORY</div>
    <div style="font-weight:800;color:${headline};margin-bottom:8px;font-size:13px">${escapeHtml(name)}</div>
    <div style="display:grid;gap:4px;font-size:10px;border-top:${divider};padding-top:8px">
      <div><span style="color:${label}">Continent</span> · <span style="color:${val}">${escapeHtml(continent)}</span></div>
      <div><span style="color:${label}">ISO</span> · <span style="color:${val}">${escapeHtml(iso)}</span></div>
      ${pop ? `<div><span style="color:${label}">Population (est.)</span> · <span style="color:${val}">${pop}</span></div>` : ""}
    </div>
  </div>`;
}

interface GlobeComponentProps {
  signals: Signal[];
  selectedSignal: Signal | null;
  onSignalClick: (signal: Signal | null) => void;
  globeStyle: "realistic" | "dark" | "wireframe";
  uiColorMode?: SignalsColorMode;
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
  const {
    signals,
    selectedSignal,
    onSignalClick,
    globeStyle,
    uiColorMode = "dark",
  } = props;
  const isLight = uiColorMode === "light";
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

  /** One label per country (no city/region); placed at the strongest signal in that country. */
  const labelsData = useMemo(() => {
    const byCountry = new Map<string, Signal>();
    for (const s of signals) {
      const key = s.country?.trim() || "Unknown";
      const prev = byCountry.get(key);
      if (!prev || s.impactScore > prev.impactScore) {
        byCountry.set(key, s);
      }
    }
    return Array.from(byCountry.values()).map((s) => ({
      ...s,
      labelName: (s.country?.trim() || "Unknown").toUpperCase(),
    }));
  }, [signals]);

  const globeImageUrl = useMemo(() => {
    switch (globeStyle) {
      case "realistic":
        return REALISTIC_GLOBE_TEXTURE;
      case "wireframe":
        return WIREFRAME_GLOBE_TEXTURE;
      default:
        return DARK_GLOBE_TEXTURE;
    }
  }, [globeStyle]);

  const globeBg = isLight ? "rgba(241,245,249,0.94)" : "rgba(2,2,3,0.96)";
  const atmosphereColor = isLight
    ? "rgba(14, 165, 233, 0.25)"
    : "rgba(40, 10, 12, 0.35)";
  const defaultCap = isLight ? "rgba(226, 232, 240, 0.75)" : "rgba(6, 6, 10, 0.88)";
  const defaultStroke = isLight ? "rgba(100, 116, 139, 0.4)" : "rgba(90, 90, 102, 0.35)";
  /** Dark UI: faint light glyphs. Light UI: match globe texture (dark earth → bright text; bright maps → dark text). */
  const idleLabelColor = useMemo(() => {
    if (!isLight) return "rgba(220, 220, 228, 0.55)";
    if (globeStyle === "dark") {
      return "rgba(255, 255, 255, 0.94)";
    }
    return "rgba(15, 23, 42, 0.96)";
  }, [isLight, globeStyle]);

  const idleLabelSize = useMemo(() => {
    if (!isLight) return 0.35;
    if (globeStyle === "dark") return 0.44;
    return 0.52;
  }, [isLight, globeStyle]);

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
      className={cn(
        "relative h-full w-full overflow-hidden font-mono",
        isLight ? "bg-slate-100" : "bg-[#020203]",
      )}
    >
      {/* 📡 HUD OVERLAY: ACTIVE COORDINATES */}
      {selectedSignal && (
        <div className="pointer-events-none absolute right-4 top-16 z-30 flex animate-pulse flex-col items-end md:right-8 md:top-20">
          <span
            className={cn(
              "text-[8px] tracking-[0.3em] md:text-[9px]",
              isLight ? "text-slate-700" : "text-gray-500",
            )}
          >
            GPS_LOCK_CONFIRMED
          </span>
          <span
            className="text-[10px] font-bold tracking-widest md:text-xs"
            style={{ color: activeColor }}
          >
            {formatLatLng(selectedSignal.lat, selectedSignal.lng)}
          </span>
          <span
            className={cn(
              "mt-1 max-w-[14rem] text-right text-[9px] leading-snug",
              isLight ? "text-slate-800" : "text-gray-500",
            )}
          >
            {selectedSignal.city} · {selectedSignal.country} ·{" "}
            {macroRegionForCountry(selectedSignal.country)}
          </span>
        </div>
      )}

      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl={globeImageUrl}
        backgroundColor={globeBg}
        showGraticules={true}
        showAtmosphere={true}
        atmosphereColor={atmosphereColor}
        atmosphereAltitude={0.12}
        polygonsData={geoData.features}
        polygonCapColor={(d: any) => {
          const name = d.properties.NAME;
          const target = selectedSignal?.country;
          const mappedName = COUNTRY_NAME_MAP[target || ""] || target;
          if (selectedSignal && name === mappedName) {
            return getImpactColor(selectedSignal.impactScore, 0.22);
          }
          return defaultCap;
        }}
        polygonSideColor={() => "rgba(0, 0, 0, 0)"}
        polygonStrokeColor={(d: any) => {
          const name = d.properties.NAME;
          const target = selectedSignal?.country;
          const mappedName = COUNTRY_NAME_MAP[target || ""] || target;
          if (selectedSignal && name === mappedName) {
            return getImpactColor(selectedSignal.impactScore, 0.55);
          }
          return defaultStroke;
        }}
        polygonLabel={(d: any) => countryPolygonTooltip(d, uiColorMode)}
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
        pointLabel={(d: any) => signalPointTooltip(d as Signal, uiColorMode)}
        labelsData={labelsData}
        labelLat="lat"
        labelLng="lng"
        labelText="labelName"
        labelAltitude={0.02}
        labelSize={(d: any) =>
          d.id === selectedSignal?.id ? 0.95 : idleLabelSize
        }
        labelColor={(d: any) =>
          d.id === selectedSignal?.id
            ? getImpactColor(d.impactScore)
            : idleLabelColor
        }
        labelDotRadius={isLight ? 0.42 : 0.35}
        onLabelClick={(label: any) => onSignalClick(label)}
      />

      {/* 📂 TACTICAL DOSSIER (FULLSCREEN MOBILE / SIDEBAR DESKTOP) */}
      {selectedSignal && (
        <div
          className={cn(
            "fixed inset-0 z-[100] flex animate-in flex-col fade-in duration-300 zoom-in-95 backdrop-blur-3xl md:absolute md:inset-auto md:bottom-6 md:left-6 md:top-6 md:w-96 md:zoom-in-100 md:slide-in-from-left md:duration-500",
            isLight
              ? "border-slate-200 bg-white/95 shadow-[20px_0_60px_rgba(15,23,42,0.12)] md:border md:bg-white/90"
              : "border-white/10 bg-[#0A0A0F]/95 shadow-[20px_0_60px_rgba(0,0,0,0.9)] md:border md:bg-[#0A0A0F]/85",
          )}
        >
          {/* Mobile Header */}
          <div
            className={cn(
              "flex items-center justify-between border-b px-6 py-5 md:hidden",
              isLight
                ? "border-slate-200 bg-slate-50/80"
                : "border-white/5 bg-white/[0.02]",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-2 w-2 animate-pulse rounded-full"
                style={{ backgroundColor: activeColor }}
              />
              <span
                className={cn(
                  "text-[10px] font-black uppercase tracking-[0.3em]",
                  isLight ? "text-slate-500" : "text-gray-400",
                )}
              >
                Dossier_Lock_Active
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSignalClick(null)}
              className={cn(
                "rounded-full p-2 transition-colors",
                isLight
                  ? "text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                  : "text-gray-400 hover:bg-white/10 hover:text-white",
              )}
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
                <div
                  className={cn(
                    "text-[9px] uppercase tracking-widest md:text-[9px]",
                    isLight ? "text-slate-500" : "text-gray-500",
                  )}
                >
                  ID: {selectedSignal.id.slice(0, 12)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSignalClick(null)}
                className={cn(
                  "hidden rounded-full p-1.5 md:block",
                  isLight
                    ? "text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                    : "text-gray-500 hover:bg-white/10 hover:text-white",
                )}
              >
                <X size={20} />
              </button>
            </div>

            <h2
              className={cn(
                "mb-6 border-l-2 pl-4 text-xl font-bold italic leading-[1.2] tracking-tight md:mb-6 md:text-xl",
                isLight ? "text-slate-900" : "text-white",
              )}
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

            <div className="mb-8 space-y-4 md:mb-8 md:space-y-4">
              <div
                className={cn(
                  "flex items-center gap-2 border-b pb-2 text-[10px] font-bold uppercase tracking-widest md:text-[10px]",
                  isLight
                    ? "border-slate-200 text-slate-500"
                    : "border-white/5 text-gray-400",
                )}
              >
                Situational Summary
              </div>
              <p
                className={cn(
                  "text-[13px] font-medium leading-relaxed md:text-[13px]",
                  isLight ? "text-slate-700" : "text-gray-300",
                )}
              >
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

            <div className="mb-10 space-y-4 md:mb-10 md:space-y-4">
              <div
                className={cn(
                  "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest md:text-[10px]",
                  isLight ? "text-slate-500" : "text-gray-600",
                )}
              >
                <Hash className="h-3 w-3 md:h-3 md:w-3" /> Pattern Match
              </div>
              <div className="flex flex-wrap gap-2">
                {(selectedSignal.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      "px-2.5 py-1 text-[9px] font-black uppercase md:text-[9px]",
                      isLight
                        ? "border border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900"
                        : "border border-white/10 bg-white/5 text-gray-400 hover:text-white",
                    )}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* 📍 LOCAL SPECIFICS */}
            <div
              className={cn(
                "grid grid-cols-2 gap-6 border-t pt-8 md:gap-6 md:pt-8",
                isLight ? "border-slate-200" : "border-white/10",
              )}
            >
              <div className="space-y-1.5">
                <div
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-tighter md:text-[9px]",
                    isLight ? "text-slate-500" : "text-gray-600",
                  )}
                >
                  Operational Scale
                </div>
                <div
                  className={cn(
                    "text-[11px] font-black uppercase md:text-[11px]",
                    isLight ? "text-slate-900" : "text-white",
                  )}
                >
                  {selectedSignal.impactScore < 40
                    ? "Tactical_Local"
                    : selectedSignal.impactScore < 75
                      ? "National_Strategic"
                      : "Global_Surveillance"}
                </div>
              </div>
              <div className="space-y-1.5 text-right">
                <div
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-tighter md:text-[9px]",
                    isLight ? "text-slate-500" : "text-gray-600",
                  )}
                >
                  Sector
                </div>
                <div
                  className={cn(
                    "text-[11px] font-black uppercase md:text-[11px]",
                    isLight ? "text-slate-900" : "text-white",
                  )}
                >
                  {selectedSignal.category}
                </div>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "flex items-center justify-between border-t p-5 text-[9px] uppercase tracking-[0.3em] md:p-5 md:text-[9px]",
              isLight
                ? "border-slate-200 bg-slate-100/90 text-slate-500"
                : "border-white/5 bg-white/5 text-gray-600",
            )}
          >
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
