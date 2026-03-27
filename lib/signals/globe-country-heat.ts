import type { Signal } from "@/lib/aggregator/types";

/** Map short / common signal labels to Natural Earth `properties.NAME`. */
const SIGNAL_COUNTRY_TO_ADMIN: Record<string, string> = {
  USA: "United States of America",
  US: "United States of America",
  "United States": "United States of America",
  UK: "United Kingdom",
  UAE: "United Arab Emirates",
  Russia: "Russian Federation",
};

export function signalCountryToAdminName(raw: string | undefined): string | null {
  const c = raw?.trim();
  if (!c || c === "Unknown") return null;
  if (SIGNAL_COUNTRY_TO_ADMIN[c]) return SIGNAL_COUNTRY_TO_ADMIN[c];
  const up = c.toUpperCase();
  if (SIGNAL_COUNTRY_TO_ADMIN[up]) return SIGNAL_COUNTRY_TO_ADMIN[up];
  return c;
}

export type CountryActivity = {
  maxCount: number;
  byAdmin: Map<string, { count: number; maxScore: number }>;
};

export function buildCountryActivity(signals: Signal[]): CountryActivity {
  const byAdmin = new Map<string, { count: number; maxScore: number }>();
  let maxCount = 0;
  for (const s of signals) {
    const admin = signalCountryToAdminName(s.country);
    if (!admin) continue;
    const prev = byAdmin.get(admin);
    if (!prev) {
      byAdmin.set(admin, { count: 1, maxScore: s.impactScore });
      maxCount = Math.max(maxCount, 1);
    } else {
      prev.count += 1;
      prev.maxScore = Math.max(prev.maxScore, s.impactScore);
      maxCount = Math.max(maxCount, prev.count);
    }
  }
  return { byAdmin, maxCount: Math.max(maxCount, 1) };
}

/** Matches globe tiers: Glint-forward critical red, high amber, low green. */
function heatTintRgb(maxScore: number): { r: number; g: number; b: number } {
  if (maxScore >= 85) return { r: 248, g: 113, b: 113 };
  if (maxScore >= 60) return { r: 245, g: 158, b: 11 };
  return { r: 34, g: 197, b: 94 };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 0 = no activity, 1 = strongest in current feed. */
export function countryActivityIntensity(
  geoAdminName: string,
  activity: CountryActivity,
): number {
  const row = activity.byAdmin.get(geoAdminName);
  if (!row) return 0;
  const countN = row.count / activity.maxCount;
  const scoreN = row.maxScore / 100;
  return Math.min(1, countN * 0.55 + scoreN * 0.45);
}

export function heatPolygonCapRgba(
  geoAdminName: string,
  activity: CountryActivity,
  isLight: boolean,
): string | null {
  const row = activity.byAdmin.get(geoAdminName);
  if (!row) return null;
  const t = countryActivityIntensity(geoAdminName, activity);
  if (t <= 0) return null;
  const tint = heatTintRgb(row.maxScore);
  const blend = t * (isLight ? 0.42 : 0.52);
  if (isLight) {
    const br = 226;
    const bg = 232;
    const bb = 240;
    const ba = 0.75;
    return `rgba(${Math.round(lerp(br, tint.r, blend))},${Math.round(lerp(bg, tint.g, blend))},${Math.round(lerp(bb, tint.b, blend))},${lerp(ba, 0.88, blend * 0.35)})`;
  }
  const br = 0;
  const bg = 0;
  const bb = 0;
  const ba = 0.94;
  return `rgba(${Math.round(lerp(br, tint.r, blend))},${Math.round(lerp(bg, tint.g, blend))},${Math.round(lerp(bb, tint.b, blend))},${lerp(ba, 0.38, blend * 0.42)})`;
}

export function heatPolygonStrokeRgba(
  geoAdminName: string,
  activity: CountryActivity,
  isLight: boolean,
  defaultStrokeRgb: { r: number; g: number; b: number; a: number },
): string | null {
  const row = activity.byAdmin.get(geoAdminName);
  if (!row) return null;
  const t = countryActivityIntensity(geoAdminName, activity);
  if (t <= 0) return null;
  const tint = heatTintRgb(row.maxScore);
  const blend = t * (isLight ? 0.5 : 0.55);
  const { r: dr, g: dg, b: db, a: da } = defaultStrokeRgb;
  return `rgba(${Math.round(lerp(dr, tint.r, blend))},${Math.round(lerp(dg, tint.g, blend))},${Math.round(lerp(db, tint.b, blend))},${lerp(da, isLight ? 0.55 : 0.5, blend * 0.6)})`;
}
