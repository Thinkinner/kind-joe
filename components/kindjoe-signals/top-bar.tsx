"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import {
  formatSignalsViewerCount,
  useSignalsLiveViewers,
} from "@/hooks/use-signals-live-viewers";
import Image from "next/image";

export default function TopBar() {
  const liveViewers = useSignalsLiveViewers();

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center border-b border-red-950/40 bg-[#050508] px-3 sm:px-5 md:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-600/35 to-transparent" />

      <div className="relative flex w-full items-center gap-4 md:gap-6">
        {/* Brand */}
        <Link
          href="/"
          className="shrink-0 opacity-90 transition-opacity hover:opacity-100"
        >
          <Image
            src="/brand/horizontal-logo.svg"
            width={130}
            height={30}
            alt="Kind Joe"
            className="h-auto w-[88px] sm:w-[118px] md:w-[136px]"
            priority
          />
        </Link>

        {/* Center: LIVE audience — red theme */}
        <div className="flex min-w-0 flex-1 justify-center">
          <div
            className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-red-500/40 bg-gradient-to-b from-red-950/50 to-red-950/25 px-3 py-1.5 pl-3 pr-4 shadow-[0_0_24px_rgba(220,38,38,0.15)] sm:gap-3 sm:px-5 sm:py-2"
            title="Estimated live viewers"
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)] sm:h-3 sm:w-3" />
            </span>
            <span className="shrink-0 text-[10px] font-black tracking-[0.28em] text-red-500 sm:text-[11px]">
              LIVE
            </span>
            <Eye
              className="hidden h-[18px] w-[18px] shrink-0 text-red-400 sm:block sm:h-5 sm:w-5"
              aria-hidden
            />
            <span className="truncate font-mono text-base font-bold tabular-nums text-white sm:text-lg md:text-xl">
              {formatSignalsViewerCount(liveViewers)}
            </span>
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-200/90 sm:text-xs">
              watching
            </span>
          </div>
        </div>

        {/* Right: status */}
        <div className="hidden shrink-0 flex-col items-end gap-0.5 text-right sm:flex">
          <span className="text-[8px] font-mono tracking-[0.2em] text-red-900/80 uppercase">
            Feed
          </span>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/40" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
            <span className="text-[9px] font-mono font-bold tracking-wide text-red-400 md:text-[10px]">
              LIVE_SYNC
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
