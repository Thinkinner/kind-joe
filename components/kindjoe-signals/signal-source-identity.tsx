"use client";

import {
  Globe2,
  Newspaper,
  Send,
  Waves,
  Earth,
  Landmark,
  BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Signal, SignalTrustTier } from "@/lib/aggregator/types";

export function trustTierLabel(tier: SignalTrustTier | null | undefined): string {
  if (tier === "high") return "HIGH REP";
  if (tier === "low") return "LOW";
  return "MED";
}

function sourceGlyph(
  iconKey: string | null | undefined,
  className: string,
) {
  const k = (iconKey ?? "").toLowerCase();
  if (k.includes("telegram")) return <Send className={className} aria-hidden />;
  if (k.includes("x")) return <Waves className={className} aria-hidden />;
  if (k.includes("usgs")) return <Earth className={className} aria-hidden />;
  if (k.includes("google")) return <Landmark className={className} aria-hidden />;
  return <Newspaper className={className} aria-hidden />;
}

export function SignalSourceIdentity({
  signal,
  isLight,
  compact = false,
}: {
  signal: Signal;
  isLight: boolean;
  compact?: boolean;
}) {
  const displayName = signal.sourceDisplayName?.trim() || signal.source;
  const trustLabel = trustTierLabel(signal.trustTier);
  const handle = signal.sourceHandle?.trim();

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border",
          isLight
            ? "border-slate-300 bg-slate-100 text-slate-700"
            : "border-white/15 bg-white/[0.06] text-slate-200",
        )}
      >
        {typeof signal.sourceAvatarUrl === "string" &&
        signal.sourceAvatarUrl.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote publisher avatars from worker metadata
          <img
            src={signal.sourceAvatarUrl}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          sourceGlyph(signal.sourceIconKey, "h-4 w-4")
        )}
      </span>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "truncate font-semibold tracking-tight",
              compact ? "text-[12px]" : "text-[13px]",
              isLight ? "text-slate-900" : "text-white",
            )}
          >
            {displayName}
          </span>
          {signal.sourceVerified ? (
            <BadgeCheck
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                isLight ? "text-sky-600" : "text-sky-400",
              )}
              aria-hidden
            />
          ) : null}
          <span
            className={cn(
              "shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.14em]",
              trustLabel === "HIGH REP"
                ? isLight
                  ? "border-sky-300 bg-sky-100 text-sky-800"
                  : "border-sky-400/50 bg-sky-500/10 text-sky-300"
                : trustLabel === "LOW"
                  ? isLight
                    ? "border-slate-300 bg-slate-100 text-slate-600"
                    : "border-white/10 bg-white/[0.03] text-slate-400"
                  : isLight
                    ? "border-amber-300 bg-amber-100 text-amber-800"
                    : "border-amber-400/50 bg-amber-500/10 text-amber-300",
            )}
          >
            {trustLabel}
          </span>
        </div>
        {!compact && handle ? (
          <div
            className={cn(
              "truncate text-[11px] font-medium",
              isLight ? "text-slate-500" : "text-slate-400",
            )}
          >
            {handle}
          </div>
        ) : null}
      </div>
      <Globe2
        className={cn(
          "ml-auto h-3.5 w-3.5 shrink-0",
          isLight ? "text-slate-400" : "text-slate-500",
        )}
        aria-hidden
      />
    </div>
  );
}

