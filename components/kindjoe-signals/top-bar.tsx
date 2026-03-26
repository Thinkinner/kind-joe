"use client";

import Link from "next/link";
import { Eye, Moon, Sun } from "lucide-react";
import {
  formatSignalsViewerCount,
  useSignalsLiveViewers,
} from "@/hooks/use-signals-live-viewers";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useSignalsColorMode } from "@/components/kindjoe-signals/signals-color-mode";

export default function TopBar() {
  const liveViewers = useSignalsLiveViewers();
  const { mode, toggle } = useSignalsColorMode();
  const isLight = mode === "light";

  return (
    <header
      className={cn(
        "relative z-30 flex h-14 shrink-0 items-center border-b px-3 sm:px-5 md:px-8",
        isLight
          ? "border-red-200/80 bg-white/90 backdrop-blur-sm"
          : "border-red-950/40 bg-[#050508]",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
          isLight ? "via-red-500/25" : "via-red-600/35",
        )}
      />

      <div className="relative flex w-full items-center gap-3 md:gap-6">
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
            <span
              className={cn(
                "truncate font-mono text-base font-bold tabular-nums sm:text-lg md:text-xl",
                isLight ? "text-slate-900" : "text-white",
              )}
            >
              {formatSignalsViewerCount(liveViewers)}
            </span>
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-200/90 sm:text-xs">
              watching
            </span>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label={
              isLight ? "Switch to dark mode" : "Switch to light mode"
            }
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors",
              isLight
                ? "border-slate-200 bg-slate-100 text-amber-600 hover:bg-slate-200"
                : "border-white/10 bg-white/5 text-amber-200/90 hover:bg-white/10",
            )}
          >
            {isLight ? (
              <Moon className="h-[18px] w-[18px]" aria-hidden />
            ) : (
              <Sun className="h-[18px] w-[18px]" aria-hidden />
            )}
          </button>

          <div
            className={cn(
              "hidden shrink-0 flex-col items-end gap-0.5 text-right sm:flex",
            )}
          >
            <span
              className={cn(
                "text-[8px] font-mono uppercase tracking-[0.2em]",
                isLight ? "text-red-700/70" : "text-red-900/80",
              )}
            >
              Feed
            </span>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/40" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
              <span
                className={cn(
                  "text-[9px] font-mono font-bold tracking-wide md:text-[10px]",
                  isLight ? "text-red-600" : "text-red-400",
                )}
              >
                LIVE_SYNC
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
