import type { Signal } from "@/lib/aggregator/types";

export type ImpactSeverity = "low" | "medium" | "high" | "critical";

/**
 * Rows already stored as impact 50 with no enrichment metadata are the TweetShift placeholder pattern
 * (see factory placeholderImpact50). Show 0 in UI until a real enriched score is persisted.
 */
export function effectiveImpactScore(
  signal: Pick<Signal, "impactScore" | "enrichmentProvider" | "source">,
): number {
  const raw = signal.impactScore;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 0;
  const n = Math.max(0, Math.min(100, Math.round(raw)));
  if (n !== 50) return n;
  if (signal.enrichmentProvider?.trim()) return n;
  if (
    signal.source === "X" ||
    signal.source === "Telegram" ||
    signal.source === "Discord"
  ) {
    return 0;
  }
  return n;
}

/** Aligns with globe / dossier: critical 85+, high 60+, medium 40+, low below. */
export function getImpactSeverity(score: number): ImpactSeverity {
  if (score >= 85) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function impactTierLabel(tier: ImpactSeverity): string {
  const labels: Record<ImpactSeverity, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  };
  return labels[tier];
}

/** Short uppercase tag for dense UI (feed). */
export function impactTierTag(tier: ImpactSeverity): string {
  const tags: Record<ImpactSeverity, string> = {
    low: "LOW",
    medium: "MED",
    high: "HIGH",
    critical: "CRIT",
  };
  return tags[tier];
}

const TIER_RGB: Record<ImpactSeverity, { r: number; g: number; b: number }> = {
  low: { r: 16, g: 185, b: 129 },
  medium: { r: 245, g: 158, b: 11 },
  high: { r: 249, g: 115, b: 22 },
  critical: { r: 239, g: 68, b: 68 },
};

const TIER_HEX: Record<ImpactSeverity, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

export function impactTierRgb(tier: ImpactSeverity): {
  r: number;
  g: number;
  b: number;
} {
  return TIER_RGB[tier];
}

export function impactTierHex(tier: ImpactSeverity): string {
  return TIER_HEX[tier];
}

/** Impact meter segments (Tailwind). */
export function impactTierBarSegmentClass(tier: ImpactSeverity): string {
  const c: Record<ImpactSeverity, string> = {
    low: "bg-emerald-500",
    medium: "bg-amber-500",
    high: "bg-orange-500",
    critical: "bg-red-500",
  };
  return c[tier];
}

/** Left accent on feed cards. */
export function impactTierBorderLeftClass(tier: ImpactSeverity): string {
  const c: Record<ImpactSeverity, string> = {
    low: "border-l-emerald-500",
    medium: "border-l-amber-500",
    high: "border-l-orange-500",
    critical: "border-l-red-500",
  };
  return c[tier];
}

export function impactTierScoreTextClass(
  tier: ImpactSeverity,
  isLight: boolean,
): string {
  if (isLight) {
    const c: Record<ImpactSeverity, string> = {
      low: "text-emerald-800",
      medium: "text-amber-800",
      high: "text-orange-800",
      critical: "text-red-700",
    };
    return c[tier];
  }
  const c: Record<ImpactSeverity, string> = {
    low: "text-emerald-400",
    medium: "text-amber-400",
    high: "text-orange-400",
    critical: "text-red-400",
  };
  return c[tier];
}

/** “Fresh” timestamp tint when &lt; 2m. */
export function impactTierFreshTimeClass(
  tier: ImpactSeverity,
  isLight: boolean,
): string {
  if (isLight) {
    const c: Record<ImpactSeverity, string> = {
      low: "text-emerald-600",
      medium: "text-amber-600",
      high: "text-orange-600",
      critical: "text-red-600",
    };
    return c[tier];
  }
  const c: Record<ImpactSeverity, string> = {
    low: "text-emerald-400",
    medium: "text-amber-400",
    high: "text-orange-400",
    critical: "text-red-400",
  };
  return c[tier];
}

/** Small tier pill next to score. */
export function impactTierBadgeClass(
  tier: ImpactSeverity,
  isLight: boolean,
): string {
  if (isLight) {
    const c: Record<ImpactSeverity, string> = {
      low: "bg-emerald-100 text-emerald-900 border-emerald-200",
      medium: "bg-amber-100 text-amber-950 border-amber-200",
      high: "bg-orange-100 text-orange-950 border-orange-200",
      critical: "bg-red-100 text-red-900 border-red-200",
    };
    return c[tier];
  }
  const c: Record<ImpactSeverity, string> = {
    low: "bg-emerald-950/50 text-emerald-300 border-emerald-500/30",
    medium: "bg-amber-950/40 text-amber-300 border-amber-500/35",
    high: "bg-orange-950/40 text-orange-300 border-orange-500/35",
    critical: "bg-red-950/40 text-red-300 border-red-500/35",
  };
  return c[tier];
}

/** Selected card: border + glow by tier. */
export function impactTierSelectedCardClass(
  tier: ImpactSeverity,
  isLight: boolean,
): string {
  if (isLight) {
    const c: Record<ImpactSeverity, string> = {
      low: "border-emerald-500 bg-emerald-50/80 shadow-[0_0_14px_rgba(16,185,129,0.12)]",
      medium: "border-amber-500 bg-amber-50/80 shadow-[0_0_14px_rgba(245,158,11,0.12)]",
      high: "border-orange-500 bg-orange-50/80 shadow-[0_0_14px_rgba(249,115,22,0.12)]",
      critical: "border-red-500 bg-red-50/90 shadow-[0_0_14px_rgba(239,68,68,0.12)]",
    };
    return c[tier];
  }
  const c: Record<ImpactSeverity, string> = {
    low: "border-emerald-500/80 bg-emerald-950/20 shadow-[0_0_14px_rgba(16,185,129,0.14)]",
    medium: "border-amber-500/70 bg-amber-950/25 shadow-[0_0_14px_rgba(245,158,11,0.12)]",
    high: "border-orange-500/70 bg-orange-950/25 shadow-[0_0_14px_rgba(249,115,22,0.12)]",
    critical: "border-red-500/80 bg-red-950/30 shadow-[0_0_14px_rgba(239,68,68,0.14)]",
  };
  return c[tier];
}

/** Locked row icon + label. */
export function impactTierAccentTextClass(
  tier: ImpactSeverity,
  isLight: boolean,
): string {
  if (isLight) {
    const c: Record<ImpactSeverity, string> = {
      low: "text-emerald-600",
      medium: "text-amber-700",
      high: "text-orange-700",
      critical: "text-red-600",
    };
    return c[tier];
  }
  const c: Record<ImpactSeverity, string> = {
    low: "text-emerald-400",
    medium: "text-amber-400",
    high: "text-orange-400",
    critical: "text-red-400",
  };
  return c[tier];
}
