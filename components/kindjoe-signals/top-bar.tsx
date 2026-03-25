"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, Activity, Database, Clock } from "lucide-react";
import Image from "next/image";

interface TopBarProps {
  tension: number;
  setTension: (val: number) => void;
  signalCount: number;
}

export default function TopBar({ tension, setTension, signalCount }: TopBarProps) {
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
    <div className="h-14 bg-[#050508] border-b border-white/10 flex items-center justify-between px-4 md:px-6 shrink-0 z-30 relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00BFFF]/20 to-transparent" />

      <div className="flex items-center gap-8">
        {/* Logo */}
        <Image
          src="/brand/horizontal-logo.svg"
          width={130}
          height={30}
          alt="Aether"
          className="opacity-90 hover:opacity-100 transition-opacity"
        />

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
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 text-gray-500">
             <Database size={10} />
             <span className="text-[9px] font-mono tracking-widest uppercase">Nodes</span>
          </div>
          <span className="text-white font-mono font-bold text-xs">{signalCount.toLocaleString()}</span>
        </div>

        <div className="h-8 w-px bg-white/10" />

        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 text-gray-500">
             <Clock size={10} />
             <span className="text-[9px] font-mono tracking-widest uppercase">Universal</span>
          </div>
          <span className="text-white font-mono text-xs tracking-wider">
            {mounted ? time.toISOString().substring(11, 19) : "00:00:00"}<span className="text-[10px] opacity-40 ml-1">Z</span>
          </span>
        </div>
      </div>
    </div>
  );
}/*  */