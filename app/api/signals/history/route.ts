"use server";

import { getSignalsFromDB, syncRealTimeNews } from "@/lib/aggregator";
import { Signal, type GeographicScope } from "@/lib/aggregator/types";

function normalizeScope(raw: string | null | undefined): GeographicScope {
  const v = (raw ?? "global").toLowerCase().trim();
  if (v === "local" || v === "regional" || v === "national" || v === "global") {
    return v;
  }
  return "global";
}

export async function getHistory(): Promise<Signal[]> {
  const rawData = await getSignalsFromDB();
  return rawData.map((s) => ({
    id: s.id,
    headline: s.headline,
    summary: s.summary ?? "",
    source: s.source as Signal["source"],
    sourceUrl: s.sourceUrl?.trim() || undefined,
    category: s.category as Signal["category"],
    lat: s.lat,
    lng: s.lng,
    city: s.city ?? "Unknown",
    country: s.country ?? "Unknown",
    geographicScope: normalizeScope(s.geographicScope),
    adminArea: s.adminArea?.trim() ?? "",
    impactScore: s.impactScore ?? 0,
    timestamp: s.timestamp ? s.timestamp.getTime() : Date.now(),
    tags: (s.tags as string[]) ?? [],
  }));
}

// 2. SLOW: Trigger the RSS + Gemini AI Sync
export async function triggerSync() {
  await syncRealTimeNews();
}