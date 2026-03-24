"use client";

import { Search, Settings, Filter } from "lucide-react";

interface BottomBarProps {
  globeStyle: "realistic" | "dark" | "wireframe";
  setGlobeStyle: (style: "realistic" | "dark" | "wireframe") => void;
}

export default function BottomBar({
  globeStyle,
  setGlobeStyle,
}: BottomBarProps) {
  return (
    <div className="h-12 bg-[#0A0A0F] border-t border-gray-800 flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden md:flex items-center gap-2 text-xs font-mono text-gray-500">
          <Filter size={14} />
          <button className="hover:text-white transition-colors">All</button>
          <span className="text-gray-800">|</span>
          <button className="hover:text-white transition-colors">
            Last 5 min
          </button>
          <span className="text-gray-800">|</span>
          <button className="hover:text-white transition-colors">
            Last hour
          </button>
        </div>

        <div className="hidden md:block h-4 w-px bg-gray-800 mx-2" />

        <div className="relative group">
          <Search
            size={14}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#00BFFF] transition-colors"
          />
          <input
            type="text"
            placeholder="Search..."
            className="bg-black/50 border border-gray-800 rounded px-8 py-1 text-xs font-mono text-white focus:outline-none focus:border-[#00BFFF]/50 focus:ring-1 focus:ring-[#00BFFF]/50 transition-all w-32 md:w-64"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex items-center gap-2 text-xs font-mono">
          <Settings size={14} className="text-gray-500" />
          <select
            value={globeStyle}
            onChange={(e) => setGlobeStyle(e.target.value as any)}
            className="bg-transparent text-gray-400 hover:text-white focus:outline-none cursor-pointer w-24 md:w-auto"
          >
            <option value="dark">Dark Globe</option>
            <option value="realistic">Realistic</option>
            <option value="wireframe">Wireframe</option>
          </select>
        </div>

        <div className="hidden lg:flex text-[10px] font-mono text-gray-500 tracking-widest uppercase items-center gap-2">
          <span>Powered by The Kind Joe</span>
          <span className="text-[#00BFFF]">💙❤️</span>
          <span>Bringing both sides together</span>
        </div>
      </div>
    </div>
  );
}
