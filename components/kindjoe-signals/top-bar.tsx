"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, Database, Clock, Eye } from "lucide-react";
import {
  formatSignalsViewerCount,
  useSignalsLiveViewers,
} from "@/hooks/use-signals-live-viewers";
import Image from "next/image";

interface TopBarProps {
  tension: number;
  setTension: (val: number) => void;
  signalCount: number;
}

export default function TopBar({ tension, setTension, signalCount }: TopBarProps) {
  const [time, setTime] = useState(() => new Date());
  const liveViewers = useSignalsLiveViewers();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getTensionColor = () => {
    if (tension < 30) return "text-emerald-500";
    if (tension < 60) return "text-yellow-500";
    if (tension < 80) return "text-orange-500";
    return "text-red-500";
  };

  const getTensionLabel = () => {
    if (tension < 30) return "NOMINAL";
    if (tension < 60) return "ELEVATED";
    if (tension < 80) return "VOLATILE";
    return "CRITICAL";
  };

  return (
    <div className="min-h-14 h-14 bg-[#050508] border-b border-white/10 flex items-center justify-between gap-2 px-3 sm:px-4 md:px-6 shrink-0 z-30 relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00BFFF]/20 to-transparent" />

      <div className="flex items-center gap-2 min-w-0 sm:gap-4 lg:gap-8">
        {/* Logo */}
        <Image
          src="/brand/horizontal-logo.svg"
          width={130}
          height={30}
          alt="Aether"
          className="opacity-90 hover:opacity-100 transition-opacity shrink-0 w-[88px] sm:w-[115px] md:w-[130px] h-auto"
        />

        <div
          className="flex sm:hidden items-center gap-1.5 shrink-0 rounded-md border border-[#00BFFF]/25 bg-[#00BFFF]/[0.06] px-2 py-1.5 shadow-[0_0_12px_rgba(0,191,255,0.12)]"
          title="Estimated live viewers"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
          </span>
          <Eye size={13} className="text-[#00BFFF]" aria-hidden />
          <div className="flex flex-col leading-none">
            <span className="text-[9px] font-mono font-bold tabular-nums text-[#00BFFF] tracking-tight">
              {formatSignalsViewerCount(liveViewers)}
            </span>
            <span className="text-[6px] font-mono text-gray-500 uppercase tracking-[0.14em] mt-0.5">
              watching
            </span>
          </div>
        </div>

        {/* System Status */}
        <div className="hidden lg:flex items-center gap-4 border-l border-white/10 pl-8">
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-500 font-mono tracking-widest uppercase">System Status</span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse shadow-[0_0_8px_#00BFFF]" />
              <span className="text-[10px] font-mono text-[#00BFFF] font-bold tracking-tighter">OPERATIONAL // LIVE_SYNC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tension Meter (Center HUD) */}
      <div className="hidden md:flex items-center gap-6 px-6 py-1.5 rounded-sm border border-white/5 bg-white/[0.02]">
        <div className="flex flex-col items-start min-w-[120px]">
          <span className="text-[8px] text-gray-500 font-mono tracking-[0.2em] uppercase mb-0.5">Tension Index</span>
          <span className={`font-mono font-bold text-[11px] ${getTensionColor()} transition-colors duration-500`}>
             {getTensionLabel()} <span className="opacity-50">[{Math.round(tension)}]</span>
          </span>
        </div>

        <div className="flex gap-0.5 h-3">
          {[...Array(10)].map((_, i) => (
            <div 
              key={i} 
              className={`w-2 rounded-sm transition-all duration-700 ${
                i < tension / 10 
                  ? (tension > 80 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-[#00BFFF] shadow-[0_0_8px_rgba(0,191,255,0.4)]') 
                  : 'bg-white/5'
              }`} 
            />
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={() => setTension(Math.max(0, tension - 5))} className="hover:text-[#00BFFF] text-gray-600 transition-colors"><Minus size={14}/></button>
          <button onClick={() => setTension(Math.min(100, tension + 5))} className="hover:text-[#00BFFF] text-gray-600 transition-colors"><Plus size={14}/></button>
        </div>
      </div>

      {/* Telemetry Data */}
      <div className="flex items-stretch gap-2 sm:gap-4 md:gap-6 shrink-0">
        <div className="hidden sm:flex flex-col items-end justify-center">
          <div className="flex items-center gap-1.5 text-gray-500">
            <Eye size={10} />
            <span className="text-[9px] font-mono tracking-widest uppercase">
              Watching
            </span>
          </div>
          <span className="text-[#00BFFF] font-mono font-bold text-xs tabular-nums">
            {formatSignalsViewerCount(liveViewers)}
          </span>
        </div>

        <div className="hidden sm:block w-px self-center h-8 bg-white/10" />

        <div className="flex flex-col items-end justify-center">
          <div className="flex items-center gap-1 text-gray-500 sm:gap-1.5">
            <Database size={10} className="shrink-0" aria-hidden />
            <span className="text-[8px] sm:text-[9px] font-mono tracking-widest uppercase">
              Nodes
            </span>
          </div>
          <span className="text-white font-mono font-bold text-[11px] sm:text-xs tabular-nums">
            {signalCount.toLocaleString()}
          </span>
        </div>

        <div className="w-px self-center h-7 sm:h-8 bg-white/10" />

        <div className="flex flex-col items-end justify-center min-w-[4.5rem] sm:min-w-0">
          <div className="flex items-center gap-1 text-gray-500 sm:gap-1.5">
            <Clock size={10} className="shrink-0" aria-hidden />
            <span className="text-[8px] sm:text-[9px] font-mono tracking-widest uppercase max-[380px]:sr-only">
              Universal
            </span>
            <span className="hidden max-[380px]:inline text-[8px] font-mono tracking-widest uppercase">
              UTC
            </span>
          </div>
          <span
            className="text-white font-mono text-[11px] sm:text-xs tracking-wider tabular-nums"
            suppressHydrationWarning
          >
            {time.toISOString().substring(11, 19)}
            <span className="text-[9px] sm:text-[10px] opacity-40 ml-0.5 sm:ml-1">
              Z
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}