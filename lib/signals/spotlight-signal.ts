import type { Signal } from "@/lib/aggregator/types";
import { effectiveImpactScore } from "@/lib/signals/impact-tier";

const TWO_MINUTES = 2 * 60 * 1000;

/** Same rules as the feed “Priority Asset” strip: hottest signal in the 2m window, impact ≥ 60. */
export function resolveSpotlightSignal(
  signals: Signal[],
  nowMs: number,
  sidebarAccessUnlocked: boolean,
): Signal | null {
  if (!sidebarAccessUnlocked || signals.length === 0) return null;
  const hotSignals = signals.filter((s) => nowMs - s.timestamp < TWO_MINUTES);
  if (hotSignals.length === 0) return null;
  const highest = hotSignals.reduce((prev, current) =>
    effectiveImpactScore(prev) > effectiveImpactScore(current) ? prev : current,
  );
  return effectiveImpactScore(highest) >= 60 ? highest : null;
}
