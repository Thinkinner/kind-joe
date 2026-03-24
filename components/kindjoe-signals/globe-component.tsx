"use client";

import { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { Signal } from "@/lib/aggregator/types";
import { X } from "lucide-react";

interface GlobeComponentProps {
  signals: Signal[];
  selectedSignal: Signal | null;
  onSignalClick: (signal: Signal) => void;
  globeStyle: "realistic" | "dark" | "wireframe";
}

const SOURCE_COLORS = {
  X: "#00BFFF",
  Telegram: "#8A2BE2",
  Discord: "#FF69B4",
  RSS: "#FFA500",
};

export default function GlobeComponent({
  signals,
  selectedSignal,
  onSignalClick,
  globeStyle,
}: GlobeComponentProps) {
  const globeRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (selectedSignal && globeRef.current) {
      globeRef.current.pointOfView(
        { lat: selectedSignal.lat, lng: selectedSignal.lng, altitude: 1.5 },
        1000,
      );
    }
  }, [selectedSignal]);

  const getGlobeImageUrl = () => {
    switch (globeStyle) {
      case "realistic":
        return "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
      case "dark":
        return "//unpkg.com/three-globe/example/img/earth-dark.jpg";
      case "wireframe":
        return "//unpkg.com/three-globe/example/img/earth-topology.png";
      default:
        return "//unpkg.com/three-globe/example/img/earth-dark.jpg";
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl={getGlobeImageUrl()}
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        pointsData={signals}
        pointLat="lat"
        pointLng="lng"
        pointColor={(d: any) =>
          SOURCE_COLORS[d.source as keyof typeof SOURCE_COLORS] || "#ffffff"
        }
        pointAltitude={(d: any) => d.impactScore / 200}
        pointRadius={(d: any) => d.impactScore / 50}
        pointsMerge={false}
        pointResolution={32}
        onPointClick={(point: any) => onSignalClick(point)}
        pointLabel={(d: any) => `
          <div class="bg-black/80 text-white p-2 rounded border border-gray-700 text-xs font-mono">
            <div class="font-bold mb-1" style="color: ${SOURCE_COLORS[d.source as keyof typeof SOURCE_COLORS]}">${d.source}</div>
            <div class="mb-1">${d.headline}</div>
            <div class="text-gray-400">${d.city}, ${d.country}</div>
          </div>
        `}
        ringsData={signals.slice(0, 5).filter((s) => s.impactScore > 60)}
        ringColor={(d: any) => (d.impactScore > 80 ? "#FF4500" : "#FFA500")}
        ringMaxRadius={(d: any) => d.impactScore / 8}
        ringPropagationSpeed={2}
        ringRepeatPeriod={800}
        htmlElementsData={signals.slice(0, 3).filter((s) => s.impactScore > 50)}
        htmlElement={(d: any) => {
          const el = document.createElement("div");
          el.innerHTML = `
            <div class="flex flex-col items-center pointer-events-none transform -translate-y-1/2">
              <div class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded backdrop-blur-md border ${
                d.impactScore > 80
                  ? "bg-red-500/20 text-red-400 border-red-500/50"
                  : "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
              } animate-pulse">
                TENSION: ${d.impactScore}
              </div>
              <div class="w-px h-6 ${
                d.impactScore > 80
                  ? "bg-gradient-to-b from-red-500 to-transparent"
                  : "bg-gradient-to-b from-yellow-500 to-transparent"
              }"></div>
            </div>
          `;
          return el;
        }}
        atmosphereColor="#00BFFF"
        atmosphereAltitude={0.15}
      />

      {/* Selected Signal Panel */}
      {selectedSignal && (
        <div className="absolute top-4 left-4 w-[calc(100%-2rem)] md:w-80 bg-black/80 backdrop-blur-md border border-[#00BFFF]/50 rounded-lg p-4 shadow-[0_0_20px_rgba(0,191,255,0.15)] z-10">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{
                  backgroundColor:
                    SOURCE_COLORS[
                      selectedSignal.source as keyof typeof SOURCE_COLORS
                    ],
                }}
              />
              <span
                className="text-xs font-mono font-bold"
                style={{
                  color:
                    SOURCE_COLORS[
                      selectedSignal.source as keyof typeof SOURCE_COLORS
                    ],
                }}
              >
                {selectedSignal.source}
              </span>
            </div>
            <button
              onClick={() => onSignalClick(null as any)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <h3 className="text-sm font-bold text-white mb-2 leading-tight">
            {selectedSignal.headline}
          </h3>

          <p className="text-xs text-gray-300 mb-4 leading-relaxed">
            {selectedSignal.summary}
          </p>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="bg-gray-900/50 p-2 rounded border border-gray-800">
              <div className="text-gray-500 uppercase mb-1">Location</div>
              <div className="text-gray-300">
                {selectedSignal.city}, {selectedSignal.country}
              </div>
            </div>
            <div className="bg-gray-900/50 p-2 rounded border border-gray-800">
              <div className="text-gray-500 uppercase mb-1">Impact Score</div>
              <div
                className={`font-bold ${
                  selectedSignal.impactScore > 80
                    ? "text-[#FF4500]"
                    : selectedSignal.impactScore > 50
                      ? "text-yellow-500"
                      : "text-green-500"
                }`}
              >
                {selectedSignal.impactScore} / 100
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
