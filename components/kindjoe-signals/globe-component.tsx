"use client";

import { feedAccentHex, feedMarkerRgba } from "@/lib/signals/feed-marker-colors";
import { GLOBE_SIGNAL_DISPLAY_LIMIT } from "@/lib/signals/globe-signal-display-limit";
import {
  getImpactSeverity,
  impactTierBadgeClass,
  impactTierHex,
  impactTierLabel,
  impactTierScoreTextClass,
} from "@/lib/signals/impact-tier";
import { useEffect, useRef, useState, useMemo } from "react";
import type { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import Globe from "react-globe.gl";
import { Signal } from "@/lib/aggregator/types";
import { X, Target, MapPin, Activity, Hash, ExternalLink } from "lucide-react";
import {
  isXOrTwitterStoryHref,
  resolveSignalSourceUrl,
  signalOutboundLinkLabel,
} from "@/lib/signals/signal-source-url";
import {
  formatLatLng,
  macroRegionForCountry,
} from "@/lib/signals/macro-region";
import { cn } from "@/lib/utils";
import type { SignalsColorMode } from "@/components/kindjoe-signals/signals-color-mode";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  GLOBE_BLOOM_NEON,
  addGlobeBloomPass,
  removeGlobeBloomPass,
  syncBloomDrawingBufferSize,
} from "@/lib/signals/globe-bloom";
import {
  buildCountryActivity,
  heatPolygonCapRgba,
  heatPolygonStrokeRgba,
  signalCountryToAdminName,
} from "@/lib/signals/globe-country-heat";

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

/** Hover card: headline + impact (tier colors match feed; red when HOT spotlight). */
function signalPointTooltip(
  d: Signal,
  mode: SignalsColorMode,
  spotlightId: string | null,
) {
  const isLight = mode === "light";
  const isHot = spotlightId !== null && d.id === spotlightId;
  const tierColor = isHot
    ? "#ef4444"
    : impactTierHex(getImpactSeverity(d.impactScore));
  const panelBg = isLight ? "rgba(255,255,255,0.98)" : "rgba(3,3,6,0.96)";
  const border = isLight
    ? "1px solid rgba(15,23,42,0.1)"
    : "1px solid rgba(255,255,255,0.1)";
  const shadow = isLight
    ? "0 8px 28px rgba(15,23,42,0.12)"
    : "0 8px 28px rgba(0,0,0,0.55)";
  const headlineColor = isLight ? "#0f172a" : "#fff";
  const sub = isLight ? "#64748b" : "#9ca3af";
  return `<div style="font-family:ui-sans-serif,system-ui,ui-monospace,monospace;font-size:12px;max-width:280px;background:${panelBg};padding:10px 12px;border:${border};border-radius:8px;line-height:1.45;box-shadow:${shadow}">
    <div style="font-weight:600;color:${headlineColor};margin-bottom:6px">${escapeHtml(d.headline.slice(0, 160))}${d.headline.length > 160 ? "…" : ""}</div>
    <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:${tierColor}">IMPACT · ${impactTierLabel(getImpactSeverity(d.impactScore)).toUpperCase()} (${d.impactScore})</div>
    <div style="margin-top:6px;font-size:10px;color:${sub}">${escapeHtml(d.city)} · ${escapeHtml(d.country)}</div>
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
  /** Same HOT signal as the feed priority strip (red on map when set). */
  spotlightSignalId: string | null;
  selectedSignal: Signal | null;
  onSignalClick: (signal: Signal | null) => void;
  globeStyle: "realistic" | "dark" | "wireframe";
  uiColorMode?: SignalsColorMode;
}

function selectedGeoAdminName(signal: Signal | null): string | null {
  if (!signal?.country?.trim()) return null;
  return signalCountryToAdminName(signal.country) ?? signal.country.trim();
}

function ringCentroid(ring: number[][]): { lat: number; lng: number } | null {
  if (!ring?.length) return null;
  let slat = 0;
  let slng = 0;
  for (const pt of ring) {
    slng += pt[0];
    slat += pt[1];
  }
  const n = ring.length;
  return { lat: slat / n, lng: slng / n };
}

/** Rough centroid for Natural Earth admin-0 features (label placement). */
function geoFeatureCentroid(feature: {
  geometry?: { type: string; coordinates: unknown };
}): { lat: number; lng: number } | null {
  const g = feature.geometry;
  if (!g) return null;
  if (g.type === "Polygon") {
    const coords = g.coordinates as number[][][];
    return ringCentroid(coords[0] ?? []);
  }
  if (g.type === "MultiPolygon") {
    const polys = g.coordinates as number[][][][];
    let best: { lat: number; lng: number } | null = null;
    let bestN = 0;
    for (const poly of polys) {
      const outer = poly[0];
      const n = outer?.length ?? 0;
      if (n > bestN) {
        best = ringCentroid(outer ?? []);
        bestN = n;
      }
    }
    return best;
  }
  return null;
}

type CountryGlobeLabel = {
  id: string;
  lat: number;
  lng: number;
  labelName: string;
  hasSignal: boolean;
  representativeSignal: Signal | null;
  impactScore: number;
  popEst: number;
};

export default function GlobeComponent(props: GlobeComponentProps) {
  const {
    signals,
    spotlightSignalId,
    selectedSignal,
    onSignalClick,
    globeStyle,
    uiColorMode = "dark",
  } = props;
  const isLight = uiColorMode === "light";
  const isMobile = useIsMobile();
  const globeRef = useRef<any>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const [globeGlReady, setGlobeGlReady] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [geoData, setGeoData] = useState({ features: [] });
  const containerRef = useRef<HTMLDivElement>(null);

  const countryActivity = useMemo(
    () => buildCountryActivity(signals),
    [signals],
  );

  /**
   * Pulse rings + points: top signals by impact, capped for perf.
   * Always include selected if it would drop off the capped list.
   */
  const ringsData = useMemo(() => {
    if (!signals.length) return [];
    const sorted = [...signals].sort((a, b) => b.impactScore - a.impactScore);

    let pick =
      sorted.length <= GLOBE_SIGNAL_DISPLAY_LIMIT
        ? sorted
        : sorted.slice(0, GLOBE_SIGNAL_DISPLAY_LIMIT);
    const ids = new Set(pick.map((s) => s.id));
    if (selectedSignal && !ids.has(selectedSignal.id)) {
      pick = [...pick.slice(0, -1), selectedSignal].sort(
        (a, b) => b.impactScore - a.impactScore,
      );
    }
    return pick;
  }, [signals, selectedSignal]);

  /**
   * Country names from admin-0 GeoJSON (centroid), with signals pinned to their coords.
   * No lat/lng graticule — borders come only from polygon strokes (country outlines).
   */
  const labelsData = useMemo((): CountryGlobeLabel[] => {
    const features = (geoData as { features?: object[] }).features;
    if (!features?.length) return [];

    const signalByAdmin = new Map<string, Signal>();
    for (const s of signals) {
      const raw = s.country?.trim();
      if (!raw) continue;
      const admin = signalCountryToAdminName(s.country) ?? raw;
      const prev = signalByAdmin.get(admin);
      if (!prev || s.impactScore > prev.impactScore) {
        signalByAdmin.set(admin, s);
      }
    }

    const minPop = isMobile ? 6_000_000 : 1_200_000;
    const out: CountryGlobeLabel[] = [];

    for (const f of features) {
      const feat = f as { properties?: Record<string, unknown>; geometry?: unknown };
      const name = feat.properties?.NAME;
      if (typeof name !== "string" || !name) continue;
      const centroid = geoFeatureCentroid(feat as { geometry?: { type: string; coordinates: unknown } });
      if (!centroid) continue;
      const rep = signalByAdmin.get(name) ?? null;
      const hasSignal = !!rep;
      const pop = Number(feat.properties?.POP_EST ?? 0);
      if (!hasSignal && pop > 0 && pop < minPop) continue;

      out.push({
        id: `country-${name}`,
        lat: rep?.lat ?? centroid.lat,
        lng: rep?.lng ?? centroid.lng,
        labelName: name.toUpperCase(),
        hasSignal,
        representativeSignal: rep,
        impactScore: rep?.impactScore ?? 0,
        popEst: pop,
      });
    }
    return out;
  }, [geoData, signals, isMobile]);

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson",
    )
      .then((res) => res.json())
      .then(setGeoData);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let raf = 0;
    const scheduleMeasure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        if (w > 0 && h > 0) {
          setDimensions({ width: w, height: h });
        }
      });
    };

    scheduleMeasure();
    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(el);
    window.addEventListener("resize", scheduleMeasure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, []);

  const globeImageUrl = useMemo(() => {
    switch (globeStyle) {
      case "realistic":
        return REALISTIC_GLOBE_TEXTURE;
      case "wireframe":
        return WIREFRAME_GLOBE_TEXTURE;
      default:
        /** Vector style: no basemap — polygon caps on background (light + dark UI). */
        return null;
    }
  }, [globeStyle]);

  const globeBg = isLight ? "rgba(241,245,249,0.94)" : "#000000";
  const defaultCap = isLight
    ? "rgba(226, 232, 240, 0.75)"
    : "rgba(0, 0, 0, 0.94)";
  /** Country outlines only — dim on black so separation reads without heavy fill. */
  const defaultStroke = isLight
    ? "rgba(71, 85, 105, 0.55)"
    : "rgba(100, 116, 139, 0.28)";
  const defaultStrokeRgb = isLight
    ? { r: 71, g: 85, b: 105, a: 0.55 }
    : { r: 100, g: 116, b: 139, a: 0.28 };

  const idleLabelColor = useMemo(() => {
    if (!isLight) return "rgba(148, 163, 184, 0.45)";
    return "rgba(15, 23, 42, 0.96)";
  }, [isLight]);

  const idleLabelSize = useMemo(() => {
    if (!isLight) return 0.35;
    return 0.52;
  }, [isLight]);

  useEffect(() => {
    if (!globeGlReady) return;
    const g = globeRef.current;
    if (!g) return;
    const composer = g.postProcessingComposer();
    const renderer = g.renderer();

    if (bloomPassRef.current) {
      removeGlobeBloomPass(composer, bloomPassRef.current);
      bloomPassRef.current = null;
    }

    if (isLight || isMobile) return;

    const bloom = addGlobeBloomPass(composer, renderer, GLOBE_BLOOM_NEON);
    bloomPassRef.current = bloom;

    return () => {
      const inst = globeRef.current;
      if (!inst || !bloomPassRef.current) return;
      try {
        removeGlobeBloomPass(inst.postProcessingComposer(), bloomPassRef.current);
      } catch {
        /* composer may be torn down */
      }
      bloomPassRef.current = null;
    };
  }, [globeGlReady, isLight, isMobile]);

  useEffect(() => {
    const bp = bloomPassRef.current;
    const g = globeRef.current;
    if (!bp || !g || isLight || isMobile) return;
    syncBloomDrawingBufferSize(bp, g.renderer());
  }, [dimensions.width, dimensions.height, isLight, isMobile]);

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
    ? feedAccentHex(selectedSignal, spotlightSignalId)
    : "#00BFFF";

  const dossierIsHot =
    !!spotlightSignalId &&
    !!selectedSignal &&
    selectedSignal.id === spotlightSignalId;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full w-full overflow-hidden font-mono",
        isLight ? "bg-slate-100" : "bg-black",
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
        showGraticules={false}
        showAtmosphere={false}
        onGlobeReady={() => setGlobeGlReady(true)}
        polygonsData={geoData.features}
        polygonAltitude={0}
        polygonCapCurvatureResolution={isMobile ? 10 : 7}
        polygonCapColor={(d: any) => {
          const name = d.properties.NAME as string;
          const selAdmin = selectedGeoAdminName(selectedSignal);
          if (selectedSignal && selAdmin && name === selAdmin) {
            return feedMarkerRgba(selectedSignal, spotlightSignalId, 0.22);
          }
          const heated = heatPolygonCapRgba(name, countryActivity, isLight);
          return heated ?? defaultCap;
        }}
        polygonSideColor={() => "rgba(0, 0, 0, 0)"}
        polygonStrokeColor={(d: any) => {
          const name = d.properties.NAME as string;
          const selAdmin = selectedGeoAdminName(selectedSignal);
          if (selectedSignal && selAdmin && name === selAdmin) {
            return feedMarkerRgba(selectedSignal, spotlightSignalId, 0.48);
          }
          const heated = heatPolygonStrokeRgba(
            name,
            countryActivity,
            isLight,
            defaultStrokeRgb,
          );
          return heated ?? defaultStroke;
        }}
        polygonLabel={(d: any) => countryPolygonTooltip(d, uiColorMode)}
        // --- Pulse rings at each signal (Glint-style news pulse dots) ---
        ringsData={ringsData}
        ringLat="lat"
        ringLng="lng"
        ringColor={(d: any) => {
          const s = d as Signal;
          return feedMarkerRgba(s, spotlightSignalId, 0.88);
        }}
        ringMaxRadius={(d: any) => {
          const s = d as Signal;
          const base =
            s.impactScore >= 85 ? 5.1 : s.impactScore >= 60 ? 3.35 : 1.85;
          return s.id === selectedSignal?.id ? base * 1.32 : base;
        }}
        ringPropagationSpeed={(d: any) => {
          const s = d as Signal;
          return s.impactScore >= 85 ? 2.45 : s.impactScore >= 60 ? 1.52 : 0.88;
        }}
        ringRepeatPeriod={(d: any) => {
          const s = d as Signal;
          const base =
            s.impactScore >= 85 ? 728 : s.impactScore >= 60 ? 1108 : 1728;
          return s.id === selectedSignal?.id ? Math.round(base * 0.72) : base;
        }}
        // --- Flat pulse dots; hover = headline + impact (open dossier on click) ---
        pointsData={ringsData}
        pointLat="lat"
        pointLng="lng"
        pointColor={(d: any) => {
          const s = d as Signal;
          return feedMarkerRgba(s, spotlightSignalId, 1);
        }}
        pointAltitude={0.024}
        pointRadius={(d: any) => {
          const s = d as Signal;
          const base =
            s.impactScore >= 85 ? 2.75 : s.impactScore >= 60 ? 1.68 : 1.05;
          return s.id === selectedSignal?.id ? base * 1.32 : base;
        }}
        pointResolution={isMobile ? 12 : 14}
        pointLabel={(d: any) =>
          signalPointTooltip(d as Signal, uiColorMode, spotlightSignalId)
        }
        onPointClick={(d: any) => onSignalClick(d as Signal)}
        labelsData={labelsData}
        labelLat="lat"
        labelLng="lng"
        labelText="labelName"
        labelAltitude={0.02}
        labelSize={(d: any) => {
          const x = d as CountryGlobeLabel;
          const isSel =
            !!selectedSignal &&
            !!x.representativeSignal &&
            x.representativeSignal.id === selectedSignal.id;
          if (isSel) return 0.98;
          if (x.hasSignal) {
            const base =
              x.impactScore >= 85 ? 0.52 : x.impactScore >= 60 ? 0.44 : 0.36;
            return base;
          }
          if (x.popEst >= 50_000_000) return idleLabelSize * 0.58;
          if (x.popEst >= 10_000_000) return idleLabelSize * 0.48;
          return idleLabelSize * 0.4;
        }}
        labelColor={(d: any) => {
          const x = d as CountryGlobeLabel;
          const isSel =
            !!selectedSignal &&
            !!x.representativeSignal &&
            x.representativeSignal.id === selectedSignal.id;
          if (isSel || (x.hasSignal && x.representativeSignal)) {
            return feedMarkerRgba(
              x.representativeSignal!,
              spotlightSignalId,
              isSel ? 1 : 0.88,
            );
          }
          return idleLabelColor;
        }}
        labelIncludeDot={(d: any) => !!(d as CountryGlobeLabel).hasSignal}
        labelDotRadius={isLight ? 0.42 : 0.35}
        onLabelClick={(label: any) => {
          const x = label as CountryGlobeLabel;
          if (x.representativeSignal) onSignalClick(x.representativeSignal);
        }}
      />

      {/* 📂 TACTICAL DOSSIER (FULLSCREEN MOBILE / SIDEBAR DESKTOP) */}
      {selectedSignal && (
        <DossierPanel
          selectedSignal={selectedSignal}
          isLight={isLight}
          activeColor={activeColor}
          dossierIsHot={dossierIsHot}
          onClose={() => onSignalClick(null)}
        />
      )}
    </div>
  );
}

function DossierPanel({
  selectedSignal,
  isLight,
  activeColor,
  dossierIsHot,
  onClose,
}: {
  selectedSignal: Signal;
  isLight: boolean;
  activeColor: string;
  dossierIsHot: boolean;
  onClose: () => void;
}) {
  const sourceHref = resolveSignalSourceUrl(
    selectedSignal.source,
    selectedSignal.sourceUrl,
  );
  const sourceLinkLabel = sourceHref
    ? signalOutboundLinkLabel(sourceHref, selectedSignal.source, 56)
    : null;
  const sourceLinkIsX = sourceHref ? isXOrTwitterStoryHref(sourceHref) : false;

  const sourceLinkShell = cn(
    "flex min-w-0 max-w-full items-center gap-2 rounded-sm border px-3 py-1.5",
    isLight
      ? "border-slate-300 bg-white text-slate-800"
      : "border-white/10 bg-white/[0.04] text-gray-300",
    isLight
      ? "cursor-pointer transition-colors hover:border-[#00BFFF] hover:bg-sky-50"
      : "cursor-pointer transition-colors hover:border-[#00BFFF]/40 hover:bg-[#00BFFF]/10 hover:text-white",
  );

  return (
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
              onClick={onClose}
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
              <button
                type="button"
                onClick={onClose}
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
                className={cn(
                  "flex items-center gap-2 rounded-sm border px-3 py-1.5",
                  dossierIsHot
                    ? isLight
                      ? "border-red-200 bg-red-50"
                      : "border-red-500/30 bg-red-500/10"
                    : impactTierBadgeClass(
                        getImpactSeverity(selectedSignal.impactScore),
                        isLight,
                      ),
                )}
              >
                <Activity
                  className={cn(
                    "h-3 w-3 md:h-3 md:w-3",
                    dossierIsHot
                      ? "text-red-500"
                      : impactTierScoreTextClass(
                          getImpactSeverity(selectedSignal.impactScore),
                          isLight,
                        ),
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-black uppercase md:text-[10px]",
                    dossierIsHot
                      ? "text-red-500"
                      : impactTierScoreTextClass(
                          getImpactSeverity(selectedSignal.impactScore),
                          isLight,
                        ),
                  )}
                >
                  {impactTierLabel(getImpactSeverity(selectedSignal.impactScore))} ·{" "}
                  {selectedSignal.impactScore}
                </span>
              </div>
              {sourceHref && sourceLinkLabel ? (
                <a
                  href={sourceHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    sourceLinkShell,
                    "group relative z-20 cursor-pointer pointer-events-auto select-text",
                  )}
                  title={sourceHref}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="pointer-events-none h-3 w-3 shrink-0 text-[#00BFFF]" />
                  <span
                    className={cn(
                      "pointer-events-none min-w-0 truncate text-[10px] underline-offset-2 group-hover:underline md:text-[10px]",
                      sourceLinkIsX
                        ? "font-black uppercase tracking-wide"
                        : "font-mono font-bold tracking-tight",
                    )}
                  >
                    {sourceLinkLabel}
                  </span>
                </a>
              ) : null}
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
                Source text
              </div>
              <p
                className={cn(
                  "whitespace-pre-wrap text-[13px] font-medium leading-relaxed md:text-[13px]",
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
  );
}
