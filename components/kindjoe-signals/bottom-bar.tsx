"use client";

import { Search, Settings, Cpu, Globe, Terminal } from "lucide-react";

interface BottomBarProps {
  globeStyle: "realistic" | "dark" | "wireframe";
  setGlobeStyle: (style: "realistic" | "dark" | "wireframe") => void;
}

export default function BottomBar({
  globeStyle,
  setGlobeStyle,
}: BottomBarProps) {
  return (
    <div className="h-10 bg-[#050508] border-t border-white/10 flex items-center justify-between px-4 md:px-6 shrink-0 z-30 font-mono">
      {/* Left Section: System Inputs */}
      <div className="flex items-center gap-4">
        {/* Quick Filter Telemetry */}
        <div className="hidden md:flex items-center gap-3 text-[9px] tracking-widest text-gray-600 uppercase">
          <span className="text-[#00BFFF]/60">FILTER_SET:</span>
          <button className="hover:text-[#00BFFF] transition-colors text-gray-400">
            RAW_FEED
          </button>
          <span className="opacity-20">/</span>
          <button className="hover:text-[#00BFFF] transition-colors">
            T-5M
          </button>
          <span className="opacity-20">/</span>
          <button className="hover:text-[#00BFFF] transition-colors">
            T-1H
          </button>
        </div>

        <div className="hidden md:block h-3 w-px bg-white/10 mx-2" />

        {/* Search Input (Tactical Style) */}
        <div className="relative flex items-center group">
          <span className="text-[10px] text-[#00BFFF] mr-2 opacity-50 font-bold">
            {">"}
          </span>
          <input
            type="text"
            placeholder="SEARCH_QUERY..."
            className="bg-transparent border-none p-0 text-[10px] text-white focus:outline-none placeholder:text-gray-700 w-32 md:w-64 tracking-widest uppercase"
          />
          {/* Animated cursor effect */}
          <div className="w-1.5 h-3 bg-[#00BFFF]/40 animate-pulse ml-1" />
        </div>
      </div>

      {/* Center Section: Animated Telemetry (Desktop Only) */}
      <div className="hidden xl:flex items-center gap-4 text-[9px] text-gray-600 tracking-[0.3em] uppercase">
        <span className="flex items-center gap-1.5">
          <Cpu size={10} className="text-[#00BFFF]/40" />
          NEURAL_LINK_STABLE
        </span>
        <span className="w-1 h-1 rounded-full bg-white/10" />
        <span className="flex items-center gap-1.5">
          <Terminal size={10} className="text-[#00BFFF]/40" />
          ENCRYPTED_STREAM
        </span>
      </div>

      {/* Right Section: Settings & Branding */}
      <div className="flex items-center gap-6">
        {/* Map Layer Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-gray-600">
            <Globe size={10} />
            <span className="text-[9px] tracking-widest uppercase">Layer:</span>
          </div>
          <select
            value={globeStyle}
            onChange={(e) => setGlobeStyle(e.target.value as any)}
            className="bg-transparent text-[10px] text-gray-400 hover:text-white focus:outline-none cursor-pointer uppercase tracking-tighter"
          >
            <option value="dark" className="bg-[#0A0A0F]">
              Vector_Dark
            </option>
            <option value="realistic" className="bg-[#0A0A0F]">
              Satellite_Live
            </option>
            <option value="wireframe" className="bg-[#0A0A0F]">
              Topo_Grid
            </option>
          </select>
        </div>

        <div className="hidden sm:block h-3 w-px bg-white/10" />

        {/* Brand Footer */}
        <div className="hidden lg:flex text-[9px] text-gray-500 tracking-[0.2em] uppercase items-center gap-3">
          <span className="flex items-center gap-1.5">
            CORE_DEV: <span className="text-gray-300 font-bold">KIND_JOE</span>
          </span>
          <div className="flex gap-0.5">
            <div className="w-1.5 h-1.5 bg-[#00BFFF]/60 rounded-sm" />
            <div className="w-1.5 h-1.5 bg-red-500/60 rounded-sm" />
          </div>
          <span className="opacity-40 italic">UNIFYING_DISCOURSE.SYS</span>
        </div>
      </div>
    </div>
  );
}
