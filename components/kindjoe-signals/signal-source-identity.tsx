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
import type { Signal } from "@/lib/aggregator/types";
import { getImpactSeverity, impactTierBadgeClass } from "@/lib/signals/impact-tier";

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
  const handle = signal.sourceHandle?.trim();
  const categoryLabel = signal.category?.trim() || "World";
  const impactLabel =
    typeof signal.impactScore === "number" && Number.isFinite(signal.impactScore)
      ? Math.max(0, Math.min(100, Math.round(signal.impactScore)))
      : 0;
  const impactTier = getImpactSeverity(impactLabel);

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
          <div className="flex shrink-0 items-center gap-1">
            <span
              className={cn(
                "rounded border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.14em]",
                isLight
                  ? "border-slate-300 bg-slate-100 text-slate-700"
                  : "border-white/15 bg-white/[0.05] text-slate-200",
              )}
            >
              {categoryLabel}
            </span>
            <span
              className={cn(
                "rounded border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.14em]",
                impactTierBadgeClass(impactTier, isLight),
              )}
            >
              {impactLabel}
            </span>
          </div>
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

