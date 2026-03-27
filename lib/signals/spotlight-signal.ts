import type { Signal } from "@/lib/aggregator/types";

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
    prev.impactScore > current.impactScore ? prev : current,
  );
  return highest.impactScore >= 60 ? highest : null;
}
