"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Minus, Plus } from "lucide-react";
import Image from "next/image";

interface TopBarProps {
  tension: number;
  setTension: (val: number) => void;
  signalCount: number;
}

export default function TopBar({
  tension,
  setTension,
  signalCount,
}: TopBarProps) {
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getTensionColor = () => {
    if (tension < 30) return "text-green-500";
    if (tension < 60) return "text-yellow-500";
    if (tension < 80) return "text-orange-500";
    return "text-[#FF4500]";
  };

  const getTensionLabel = () => {
    if (tension < 30) return "CALM";
    if (tension < 60) return "ELEVATED";
    if (tension < 80) return "HIGH";
    if (tension < 95) return "SEVERE";
    return "CRITICAL";
  };

  return (
    <div className="h-16 bg-[#0A0A0F] border-b border-gray-800 flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
      <div className="flex items-center gap-2 md:gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Image
            src="/brand/horizontal-logo.svg"
            width={120}
            height={28}
            alt="KindJoe Horizontal Logo"
            className="cursor-pointer md:w-[165px] md:h-[38px]"
          />
        </div>

        <div className="hidden sm:block h-6 w-px bg-gray-800" />

        {/* Live Badge */}
        <div className="flex items-center gap-2">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00BFFF] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00BFFF]"></span>
          </div>
          <span className="font-mono text-[#00BFFF] font-bold tracking-widest text-sm">
            LIVE
          </span>
        </div>
      </div>

      {/* Tension Meter */}
      <div className="hidden md:flex items-center gap-4 bg-black/50 px-4 py-2 rounded-lg border border-gray-800">
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
            Global News Tension
          </span>
          <span className={`font-mono font-bold text-sm ${getTensionColor()}`}>
            {getTensionLabel()} ({Math.round(tension)})
          </span>
        </div>

        <div className="w-32 h-2 bg-gray-900 rounded-full overflow-hidden flex">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${tension}%`,
              background: `linear-gradient(90deg, #00BFFF, #FF4500)`,
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <button
            onClick={() => setTension(Math.min(100, tension + 5))}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={() => setTension(Math.max(0, tension - 5))}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <Minus size={12} />
          </button>
        </div>
      </div>

      {/* Stats & Time */}
      <div className="flex items-center gap-4 md:gap-6 font-mono text-xs md:text-sm">
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-gray-500 tracking-widest uppercase">
            Signals
          </span>
          <span className="text-white font-bold">
            {signalCount.toLocaleString()}
          </span>
        </div>
        <div className="h-6 w-px bg-gray-800" />
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-gray-500 tracking-widest uppercase">
            UTC
          </span>
          <span className="text-white">
            {mounted ? time.toISOString().substring(11, 19) : "00:00:00"}
          </span>
        </div>
      </div>
    </div>
  );
}
