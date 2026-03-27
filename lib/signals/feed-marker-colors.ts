import type { Signal } from "@/lib/aggregator/types";
import {
  getImpactSeverity,
  impactTierHex,
  impactTierRgb,
} from "@/lib/signals/impact-tier";

/** Live HOT row — same red as feed priority strip */
const SPOTLIGHT = { r: 239, g: 68, b: 68 };

function strengthAlpha(score: number): number {
  if (score >= 85) return 1;
  if (score >= 60) return 0.92;
  if (score >= 40) return 0.85;
  return 0.78;
}

export function feedMarkerRgba(
  signal: Pick<Signal, "id" | "impactScore">,
  spotlightId: string | null,
  opacityMultiplier = 1,
): string {
  const isSpotlight = spotlightId !== null && signal.id === spotlightId;
  const c = isSpotlight
    ? SPOTLIGHT
    : impactTierRgb(getImpactSeverity(signal.impactScore));
  const a = Math.min(1, strengthAlpha(signal.impactScore) * opacityMultiplier);
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

export function feedAccentHex(
  signal: Pick<Signal, "id" | "impactScore">,
  spotlightId: string | null,
): string {
  const isSpotlight = spotlightId !== null && signal.id === spotlightId;
  if (isSpotlight) return "#ef4444";
  return impactTierHex(getImpactSeverity(signal.impactScore));
}
