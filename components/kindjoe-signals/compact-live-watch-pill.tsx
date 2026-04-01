"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import {
  formatSignalsViewerCount,
  useSignalsLiveViewers,
} from "@/hooks/use-signals-live-viewers";
import { cn } from "@/lib/utils";

type CompactLiveWatchPillProps = {
  className?: string;
  /** `light` fits white/neutral headers (e.g. posts). `dark` matches site navbar. */
  variant?: "light" | "dark";
};

/** Compact LIVE + viewer chip for profile-style headers. */
export function CompactLiveWatchPill({
  className,
  variant = "light",
}: CompactLiveWatchPillProps) {
  const viewers = useSignalsLiveViewers();
  const isLight = variant === "light";

  return (
    <Link
      href="/kindjoe-watch"
      title="Open Kind Joe Watch live feed"
      className={cn(
        "inline-flex h-7 max-w-full shrink-0 items-center gap-[5px] rounded-full border px-2.5 leading-none transition-colors active:opacity-90 sm:gap-1.5 sm:px-3",
        isLight
          ? "border-red-200/90 bg-gradient-to-b from-red-50/95 to-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-red-300 hover:from-red-50 hover:shadow-sm"
          : "border-red-500/40 bg-gradient-to-b from-red-950/55 to-red-950/20 shadow-[0_0_12px_rgba(220,38,38,0.1)] hover:border-red-500/55 hover:from-red-950/70 hover:to-red-950/30",
        className,
      )}
    >
      <span className="relative flex h-[5px] w-[5px] shrink-0 sm:h-1.5 sm:w-1.5">
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full",
            isLight ? "bg-red-500/35" : "bg-red-500/40",
          )}
        />
        <span
          className={cn(
            "relative inline-flex h-[5px] w-[5px] rounded-full sm:h-1.5 sm:w-1.5",
            isLight
              ? "bg-red-600 shadow-[0_0_0_1px_rgba(220,38,38,0.2)]"
              : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.65)]",
          )}
        />
      </span>
      <span
        className={cn(
          "shrink-0 text-[8px] font-black tracking-[0.16em] sm:text-[8px] sm:tracking-[0.18em]",
          isLight ? "text-red-700" : "text-red-500",
        )}
      >
        LIVE
      </span>
      <Eye
        className={cn(
          "h-3 w-3 shrink-0 sm:h-[13px] sm:w-[13px]",
          isLight ? "text-red-500" : "text-red-300/85",
        )}
        aria-hidden
      />
      <span
        className={cn(
          "font-mono text-[11px] font-bold tabular-nums sm:text-xs",
          isLight ? "text-neutral-900" : "text-white",
        )}
      >
        {formatSignalsViewerCount(viewers)}
      </span>
      <span
        className={cn(
          "shrink-0 text-[6.5px] font-semibold uppercase tracking-[0.06em] sm:text-[7px] sm:tracking-[0.08em]",
          isLight ? "text-red-800/65" : "text-red-200/80",
        )}
      >
        watching
      </span>
    </Link>
  );
}
