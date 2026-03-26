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

/**
 * 1. GET HISTORY (Fast)
 * Just reads the last 50 signals already in Drizzle.
 */
export async function getHistory(): Promise<Signal[]> {
  const rawData = await getSignalsFromDB();
  const now = Date.now(); // Server's current UTC time in milliseconds

  return rawData.map((s) => {
    // 1. Convert DB Date object to Unix Number
    let timeValue = s.timestamp ? s.timestamp.getTime() : now;

    // 2. FUTURE-PROOF: If the database time is somehow ahead of the server, cap it at 'now'
    if (timeValue > now) {
      timeValue = now;
    }

    return {
      id: s.id,
      headline: s.headline,
      summary: s.summary ?? "",
      source: s.source as any,
      category: s.category as any,
      lat: s.lat,
      lng: s.lng,
      city: s.city ?? "Unknown",
      country: s.country ?? "Unknown",
      geographicScope: normalizeScope(s.geographicScope),
      adminArea: s.adminArea?.trim() ?? "",
      impactScore: s.impactScore ?? 0,
      timestamp: timeValue, // Sending purely universal number to frontend
      tags: (s.tags as string[]) ?? [],
    };
  });
}

/**
 * 2. RUN SYNC (Slow)
 * Triggers the background process.
 */
export async function triggerSync() {
  try {
    await syncRealTimeNews();
  } catch (error) {
    console.error("Sync trigger failed:", error);
  }
}
